/**
 * Koroush Barber — Payment Gateway Provider Architecture
 * Supports Mock Provider (for development & deterministic automated testing)
 * and ZarinPal Provider (Sandbox & Live production with Tomans -> Rials conversion)
 */

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
    if (!this.merchantId) {
      throw new Error("شناسه درگاه زرین‌پال (Merchant ID) تنظیم نشده است")
    }

    // Convert Tomans to Rials reliably without floating point math
    const amountRial = Math.round(params.amountToman) * 10

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

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (data.data?.code === 100 && data.data?.authority) {
      const authority = data.data.authority
      return {
        authority,
        redirectUrl: this.getStartPayUrl(authority),
        rawResponse: data,
      }
    }

    throw new Error(
      `خطای درگاه زرین‌پال: ${data.errors?.message || data.data?.message || "امکان اتصال وجود ندارد"}`
    )
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (!this.merchantId) {
      return { success: false, errorMessage: "شناسه درگاه تنظیم نشده است" }
    }

    const amountRial = Math.round(params.amountToman) * 10
    const endpoint = `${this.getBaseUrl()}/verify.json`

    const res = await fetch(endpoint, {
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
    })

    const data = await res.json()
    const code = data.data?.code

    // 100: Successful payment, 101: Already verified (Idempotent!)
    if (code === 100 || code === 101) {
      return {
        success: true,
        refId: String(data.data.ref_id),
        cardPan: data.data.card_pan,
      }
    }

    return {
      success: false,
      errorCode: String(code || -1),
      errorMessage: data.errors?.message || "تراکنش تایید نشد",
    }
  }
}

export const MockPaymentGateway = MockPaymentGatewayImpl

export function getPaymentGateway(): PaymentGatewayProvider {
  const mode = process.env.PAYMENT_GATEWAY || "MOCK"
  if (mode.toUpperCase() === "ZARINPAL") {
    return new ZarinPalPaymentGatewayImpl()
  }
  return new MockPaymentGatewayImpl()
}
