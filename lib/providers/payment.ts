/**
 * Koroush Barber — Payment Gateway Provider Architecture
 * Supports Mock Provider (for development & deterministic automated testing)
 * and ZarinPal Provider (Sandbox & Live production with Tomans -> Rials conversion)
 */

import {
  fetchJsonWithTimeout,
  generateCorrelationId,
  logProviderTelemetry,
  sanitizeTelemetryText,
  type FailureCategory,
} from "../http"

export interface InitiatePaymentParams {
  amountToman: number
  callbackUrl: string
  description: string
  customerPhone: string
  bookingReference: string
}

export interface InitiatePaymentResult {
  authority: string
  redirectUrl: string
  correlationId?: string
  durationMs?: number
  rawResponse?: unknown
}

export interface VerifyPaymentParams {
  authority: string
  amountToman: number
}

export interface VerifyPaymentResult {
  success: boolean
  refId?: string
  cardPan?: string
  errorCode?: string
  errorMessage?: string
  isUncertain?: boolean
  failureCategory?: FailureCategory
  correlationId?: string
  durationMs?: number
  providerStatus?: number | string | null
}

export interface PaymentGatewayProvider {
  name: string
  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>
}

/**
 * Mock Payment Gateway: Deterministic, in-memory or queryable provider for dev & tests
 */
class MockPaymentGatewayImpl implements PaymentGatewayProvider {
  name = "MOCK"
  public static transactions: Map<
    string,
    {
      amountToman: number
      bookingReference: string
      customerPhone: string
      status: "PENDING" | "VERIFIED" | "FAILED"
      refId?: string
      createdAt: Date
    }
  > = new Map()

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const authority = `MOCK-AUTH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
    
    MockPaymentGatewayImpl.transactions.set(authority, {
      amountToman: params.amountToman,
      bookingReference: params.bookingReference,
      customerPhone: params.customerPhone,
      status: "PENDING",
      createdAt: new Date(),
    })

    // Simulated payment page URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const redirectUrl = `${appUrl}/payment/mock/${authority}?callback=${encodeURIComponent(params.callbackUrl)}`

    return { authority, redirectUrl }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const tx = MockPaymentGatewayImpl.transactions.get(params.authority)

    // Check simulated failure condition
    if (params.authority.includes("_FAIL") || params.authority.includes("-FAIL")) {
      return {
        success: false,
        errorCode: "-11",
        errorMessage: "تراکنش توسط کاربر یا بانک لغو گردید",
      }
    }

    const refId = `REF-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`
    if (tx) {
      tx.status = "VERIFIED"
      tx.refId = refId
    }

    return {
      success: true,
      refId,
      cardPan: "603799******4321",
    }
  }

  static clearAll() {
    this.transactions.clear()
  }
}

/**
 * ZarinPal Payment Gateway (Production / Sandbox)
 */
class ZarinPalPaymentGatewayImpl implements PaymentGatewayProvider {
  name = "ZARINPAL"
  private merchantId: string
  private isSandbox: boolean

  constructor(merchantId?: string, isSandbox?: boolean) {
    this.merchantId = merchantId || process.env.ZARINPAL_MERCHANT_ID || ""
    this.isSandbox = isSandbox ?? (process.env.ZARINPAL_SANDBOX === "true")
  }

  private getBaseUrl(): string {
    return this.isSandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment"
      : "https://payment.zarinpal.com/pg/v4/payment"
  }

  private getStartPayUrl(authority: string): string {
    return this.isSandbox
      ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
      : `https://payment.zarinpal.com/pg/StartPay/${authority}`
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const correlationId = generateCorrelationId("zp")
    if (!this.merchantId) {
      logProviderTelemetry({
        provider: this.name,
        operation: "initiatePayment",
        correlationId,
        durationMs: 0,
        responseStatus: null,
        failureCategory: "CONFIG_ERROR",
        finalState: "FAILED",
        errorSummary: "Missing ZARINPAL_MERCHANT_ID",
      })
      throw new Error("شناسه درگاه زرین‌پال (Merchant ID) تنظیم نشده است")
    }

    // Convert Tomans to Rials reliably without floating point math
    const amountRial = Math.round(params.amountToman) * 10
    const timeoutMs = Math.max(1000, parseInt(process.env.PAYMENT_TIMEOUT_MS || "10000", 10) || 10000)
    const endpoint = `${this.getBaseUrl()}/request.json`
    const payload = {
      merchant_id: this.merchantId,
      amount: amountRial,
      currency: "IRR",
      callback_url: params.callbackUrl,
      description: params.description,
      metadata: {
        mobile: params.customerPhone,
        booking_ref: params.bookingReference,
      },
    }

    type ZpReqResp = {
      data?: { code?: number; authority?: string; message?: string }
      errors?: { code?: number; message?: string }
    }

    // Bounded single attempt — never retry payment initiation blindly
    const httpRes = await fetchJsonWithTimeout<ZpReqResp>(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      timeoutMs,
      provider: this.name,
      operation: "initiatePayment",
      correlationId,
    })

    if (!httpRes.ok || !httpRes.data) {
      const providerErr = httpRes.data?.errors?.message || httpRes.errorMessage || "امکان اتصال به درگاه پرداخت وجود ندارد"
      logProviderTelemetry({
        provider: this.name,
        operation: "initiatePayment",
        correlationId,
        durationMs: httpRes.durationMs,
        responseStatus: httpRes.httpStatus,
        failureCategory: httpRes.failureCategory,
        finalState: "FAILED",
        errorSummary: providerErr,
      })
      throw new Error(`خطای درگاه زرین‌پال: ${sanitizeTelemetryText(providerErr)}`)
    }

    const code = httpRes.data.data?.code
    const authority = httpRes.data.data?.authority
    if (code === 100 && typeof authority === "string" && authority.length > 0) {
      logProviderTelemetry({
        provider: this.name,
        operation: "initiatePayment",
        correlationId,
        durationMs: httpRes.durationMs,
        responseStatus: code,
        failureCategory: "OK",
        finalState: "AUTHORITY_ISSUED",
      })
      return {
        authority,
        redirectUrl: this.getStartPayUrl(authority),
        correlationId,
        durationMs: httpRes.durationMs,
        rawResponse: httpRes.data,
      }
    }

    const providerMsg =
      httpRes.data.errors?.message || httpRes.data.data?.message || "امکان اتصال وجود ندارد"
    logProviderTelemetry({
      provider: this.name,
      operation: "initiatePayment",
      correlationId,
      durationMs: httpRes.durationMs,
      responseStatus: httpRes.data.errors?.code ?? code ?? httpRes.httpStatus,
      failureCategory: "PROVIDER_ERROR",
      finalState: "REJECTED",
      errorSummary: providerMsg,
    })
    throw new Error(`خطای درگاه زرین‌پال: ${sanitizeTelemetryText(providerMsg)}`)
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const correlationId = generateCorrelationId("zp")
    if (!this.merchantId) {
      logProviderTelemetry({
        provider: this.name,
        operation: "verifyPayment",
        correlationId,
        durationMs: 0,
        responseStatus: null,
        failureCategory: "CONFIG_ERROR",
        finalState: "FAILED",
        errorSummary: "Missing ZARINPAL_MERCHANT_ID",
      })
      return {
        success: false,
        isUncertain: false,
        failureCategory: "CONFIG_ERROR",
        errorMessage: "شناسه درگاه تنظیم نشده است",
        correlationId,
        durationMs: 0,
      }
    }

    const amountRial = Math.round(params.amountToman) * 10
    const timeoutMs = Math.max(1000, parseInt(process.env.PAYMENT_TIMEOUT_MS || "10000", 10) || 10000)
    const endpoint = `${this.getBaseUrl()}/verify.json`

    type ZpVerifyResp = {
      data?: { code?: number; ref_id?: number | string; card_pan?: string; message?: string }
      errors?: { code?: number; message?: string }
    }

    const httpRes = await fetchJsonWithTimeout<ZpVerifyResp>(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: amountRial,
        authority: params.authority,
      }),
      timeoutMs,
      provider: this.name,
      operation: "verifyPayment",
      correlationId,
    })

    if (!httpRes.ok || !httpRes.data) {
      // Explicit 4xx JSON error from ZarinPal (not 429) indicates definitive gateway rejection
      const hasExplicitBankRejection =
        httpRes.httpStatus !== null &&
        httpRes.httpStatus >= 400 &&
        httpRes.httpStatus < 500 &&
        httpRes.httpStatus !== 429 &&
        Boolean(httpRes.data?.errors?.code !== undefined)

      const isUncertain = !hasExplicitBankRejection
      const errorCode =
        httpRes.data?.errors?.code !== undefined
          ? String(httpRes.data.errors.code)
          : String(httpRes.httpStatus ?? httpRes.failureCategory)
      const errorMessage =
        httpRes.data?.errors?.message ||
        httpRes.errorMessage ||
        "خطا در تایید تراکنش با درگاه پرداخت"

      logProviderTelemetry({
        provider: this.name,
        operation: "verifyPayment",
        correlationId,
        durationMs: httpRes.durationMs,
        responseStatus: httpRes.httpStatus ?? httpRes.failureCategory,
        failureCategory: httpRes.failureCategory,
        finalState: isUncertain ? "UNCERTAIN_PENDING" : "FAILED",
        errorSummary: errorMessage,
      })

      return {
        success: false,
        isUncertain,
        failureCategory: httpRes.failureCategory,
        errorCode,
        errorMessage: sanitizeTelemetryText(errorMessage),
        correlationId,
        durationMs: httpRes.durationMs,
        providerStatus: httpRes.httpStatus,
      }
    }

    const dataObj = httpRes.data.data
    const code = dataObj?.code

    // 100: Successful payment, 101: Already verified (Idempotent)
    if (code === 100 || code === 101) {
      if (dataObj?.ref_id === undefined || dataObj?.ref_id === null || String(dataObj.ref_id).trim() === "") {
        logProviderTelemetry({
          provider: this.name,
          operation: "verifyPayment",
          correlationId,
          durationMs: httpRes.durationMs,
          responseStatus: code,
          failureCategory: "INVALID_JSON",
          finalState: "UNCERTAIN_PENDING",
          errorSummary: "Verified code returned without ref_id",
        })
        return {
          success: false,
          isUncertain: true,
          failureCategory: "INVALID_JSON",
          errorCode: String(code),
          errorMessage: "پاسخ تایید درگاه فاقد شماره مرجع معتبر است",
          correlationId,
          durationMs: httpRes.durationMs,
          providerStatus: code,
        }
      }

      logProviderTelemetry({
        provider: this.name,
        operation: "verifyPayment",
        correlationId,
        durationMs: httpRes.durationMs,
        responseStatus: code,
        failureCategory: "OK",
        finalState: code === 101 ? "ALREADY_VERIFIED" : "VERIFIED",
      })

      return {
        success: true,
        refId: String(dataObj.ref_id),
        cardPan: dataObj.card_pan,
        failureCategory: "OK",
        correlationId,
        durationMs: httpRes.durationMs,
        providerStatus: code,
      }
    }

    // Explicit non-100/101 business rejection or unexpected shape
    const explicitErrCode = httpRes.data.errors?.code ?? code
    if (explicitErrCode !== undefined) {
      const msg = httpRes.data.errors?.message || dataObj?.message || "تراکنش تایید نشد"
      logProviderTelemetry({
        provider: this.name,
        operation: "verifyPayment",
        correlationId,
        durationMs: httpRes.durationMs,
        responseStatus: explicitErrCode,
        failureCategory: "PROVIDER_ERROR",
        finalState: "REJECTED",
        errorSummary: msg,
      })
      return {
        success: false,
        isUncertain: false,
        failureCategory: "PROVIDER_ERROR",
        errorCode: String(explicitErrCode),
        errorMessage: sanitizeTelemetryText(msg),
        correlationId,
        durationMs: httpRes.durationMs,
        providerStatus: explicitErrCode,
      }
    }

    logProviderTelemetry({
      provider: this.name,
      operation: "verifyPayment",
      correlationId,
      durationMs: httpRes.durationMs,
      responseStatus: httpRes.httpStatus,
      failureCategory: "INVALID_JSON",
      finalState: "UNCERTAIN_PENDING",
      errorSummary: "Unexpected ZarinPal verify payload shape",
    })
    return {
      success: false,
      isUncertain: true,
      failureCategory: "INVALID_JSON",
      errorCode: "-1",
      errorMessage: "ساختار پاسخ درگاه پرداخت نامعتبر است",
      correlationId,
      durationMs: httpRes.durationMs,
      providerStatus: httpRes.httpStatus,
    }
  }
}

export const MockPaymentGateway = MockPaymentGatewayImpl
export const ZarinPalPaymentGateway = ZarinPalPaymentGatewayImpl

export function getPaymentGateway(): PaymentGatewayProvider {
  const mode = process.env.PAYMENT_GATEWAY || "MOCK"
  if (mode.toUpperCase() === "ZARINPAL") {
    return new ZarinPalPaymentGatewayImpl()
  }
  return new MockPaymentGatewayImpl()
}
