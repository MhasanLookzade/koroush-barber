/**
 * Koroush Barber — Iranian SMS & OTP Provider Architecture
 * Supports Mock provider (development/testing) and Kavenegar (production)
 */

import {
  fetchJsonWithTimeout,
  generateCorrelationId,
  logProviderTelemetry,
  sanitizeTelemetryText,
  type FailureCategory,
} from "../http"

export interface BookingSummary {
  trackingCode: string
  serviceName: string
  jalaliDate: string
  time: string
  depositPaid?: number
  balanceDue?: number
}

export interface SmsSendResult {
  success: boolean
  messageId?: string
  error?: string
  failureCategory?: FailureCategory
  isRetryable?: boolean
  isUncertain?: boolean
  providerStatus?: number | string | null
  correlationId?: string
  durationMs?: number
  deliveryNote?: "ACCEPTED_BY_PROVIDER" | "REJECTED_OR_FAILED" | "UNCERTAIN"
}

export interface SmsProvider {
  name: string
  isConfigured(): boolean
  sendOtp(phone: string, code: string): Promise<SmsSendResult>
  sendBookingConfirmation(phone: string, summary: BookingSummary): Promise<SmsSendResult>
  sendReminder(phone: string, summary: BookingSummary): Promise<SmsSendResult>
  sendBirthdayGreeting(phone: string, customerName?: string): Promise<SmsSendResult>
  sendCustomSms(phone: string, message: string): Promise<SmsSendResult>
}

/**
 * Standardize any Iranian phone format to 09xxxxxxxxx
 * Accepts: "+989123456789", "00989123456789", "989123456789", "09123456789", "9123456789"
 */
export function normalizeIranianPhone(rawPhone: string): string {
  if (!rawPhone) return ""
  
  // Convert any Persian or Arabic digits to Latin digits
  let clean = rawPhone
    .trim()
    .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
    .replace(/[\s\-\(\)]/g, "") // remove spaces, dashes, parentheses

  if (clean.startsWith("+98")) {
    clean = "0" + clean.substring(3)
  } else if (clean.startsWith("0098")) {
    clean = "0" + clean.substring(4)
  } else if (clean.startsWith("98") && clean.length === 12) {
    clean = "0" + clean.substring(2)
  } else if (!clean.startsWith("0") && clean.length === 10 && clean.startsWith("9")) {
    clean = "0" + clean
  }

  return clean
}

export function isValidIranianPhone(phone: string): boolean {
  const normalized = normalizeIranianPhone(phone)
  return /^09\d{9}$/.test(normalized)
}

/**
 * Mock SMS Provider: In-memory capture for instant, zero-cost, zero-secret local testing
 */
class MockSmsProviderImpl implements SmsProvider {
  name = "MOCK"
  public static sentOtps: Map<string, { code: string; sentAt: Date }> = new Map()
  public static sentMessages: Array<{ phone: string; message: string; type: string; sentAt: Date }> = []
  public static nextFailures: Array<{
    error: string
    failureCategory: FailureCategory
    isRetryable: boolean
    isUncertain?: boolean
    providerStatus?: number | string
  }> = []

  isConfigured(): boolean {
    return true
  }

  private consumeSimulatedFailure(operation: string): SmsSendResult | null {
    const sim = MockSmsProviderImpl.nextFailures.shift()
    if (!sim) return null
    const correlationId = generateCorrelationId("mocksms")
    logProviderTelemetry({
      provider: this.name,
      operation,
      correlationId,
      durationMs: 1,
      responseStatus: sim.providerStatus ?? sim.failureCategory,
      failureCategory: sim.failureCategory,
      finalState: sim.isUncertain ? "UNKNOWN" : sim.isRetryable ? "RETRY_PENDING" : "FAILED",
      errorSummary: sim.error,
    })
    return {
      success: false,
      error: sim.error,
      failureCategory: sim.failureCategory,
      isRetryable: sim.isRetryable,
      isUncertain: Boolean(sim.isUncertain),
      providerStatus: sim.providerStatus ?? sim.failureCategory,
      correlationId,
      durationMs: 1,
      deliveryNote: sim.isUncertain ? "UNCERTAIN" : "REJECTED_OR_FAILED",
    }
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    const simErr = this.consumeSimulatedFailure("sendOtp")
    if (simErr) return simErr
    const normalized = normalizeIranianPhone(phone)
    MockSmsProviderImpl.sentOtps.set(normalized, { code, sentAt: new Date() })
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message: `کد تایید کوروش باربر: ${code}`,
      type: "OTP",
      sentAt: new Date(),
    })
    return {
      success: true,
      messageId: `mock-otp-${Date.now()}`,
      failureCategory: "OK",
      isRetryable: false,
      deliveryNote: "ACCEPTED_BY_PROVIDER",
    }
  }

  async sendBookingConfirmation(phone: string, summary: BookingSummary): Promise<SmsSendResult> {
    const simErr = this.consumeSimulatedFailure("sendBookingConfirmation")
    if (simErr) return simErr
    const normalized = normalizeIranianPhone(phone)
    const text = `کوروش باربر\nنوبت شما با موفقیت ثبت شد.\nخدمت: ${summary.serviceName}\nتاریخ: ${summary.jalaliDate}\nساعت: ${summary.time}\nکد پیگیری: ${summary.trackingCode}\nمشتاق دیدارتون هستیم.`
    
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message: text,
      type: "CONFIRMATION",
      sentAt: new Date(),
    })
    return {
      success: true,
      messageId: `mock-conf-${Date.now()}`,
      failureCategory: "OK",
      isRetryable: false,
      deliveryNote: "ACCEPTED_BY_PROVIDER",
    }
  }

  async sendReminder(phone: string, summary: BookingSummary): Promise<SmsSendResult> {
    const simErr = this.consumeSimulatedFailure("sendReminder")
    if (simErr) return simErr
    const normalized = normalizeIranianPhone(phone)
    const text = `یادآوری نوبت کوروش باربر\nساعت ${summary.time} در تاریخ ${summary.jalaliDate} منتظر دیدار شما هستیم.\nکد پیگیری: ${summary.trackingCode}`
    
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message: text,
      type: "REMINDER",
      sentAt: new Date(),
    })
    return {
      success: true,
      messageId: `mock-rem-${Date.now()}`,
      failureCategory: "OK",
      isRetryable: false,
      deliveryNote: "ACCEPTED_BY_PROVIDER",
    }
  }

  async sendBirthdayGreeting(phone: string, customerName?: string): Promise<SmsSendResult> {
    const simErr = this.consumeSimulatedFailure("sendBirthdayGreeting")
    if (simErr) return simErr
    const normalized = normalizeIranianPhone(phone)
    const text = `کوروش باربر\n${customerName ? `${customerName} عزیز، ` : ""}تولدت مبارک! 🎉\nامیدواریم سال جدید زندگیت پر از اتفاق‌های خوب، سلامتی و موفقیت باشه.\nخوشحالیم که همراه کوروش باربر هستی.`
    
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message: text,
      type: "BIRTHDAY",
      sentAt: new Date(),
    })
    return {
      success: true,
      messageId: `mock-bday-${Date.now()}`,
      failureCategory: "OK",
      isRetryable: false,
      deliveryNote: "ACCEPTED_BY_PROVIDER",
    }
  }

  async sendCustomSms(phone: string, message: string, type = "CUSTOM"): Promise<SmsSendResult> {
    const simErr = this.consumeSimulatedFailure("sendCustomSms")
    if (simErr) return simErr
    const normalized = normalizeIranianPhone(phone)
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message,
      type,
      sentAt: new Date(),
    })
    return {
      success: true,
      messageId: `mock-custom-${Date.now()}`,
      failureCategory: "OK",
      isRetryable: false,
      deliveryNote: "ACCEPTED_BY_PROVIDER",
    }
  }

  // Helper for automated testing only
  static getLatestOtp(phone: string): string | null {
    const normalized = normalizeIranianPhone(phone)
    return this.sentOtps.get(normalized)?.code || null
  }

  static clearAll() {
    this.sentOtps.clear()
    this.sentMessages = []
    this.nextFailures = []
  }
}

type KavenegarJson = {
  return?: { status?: number; message?: string }
  entries?: Array<{ messageid?: number | string }>
}

/**
 * Kavenegar SMS Provider (Production)
 */
class KavenegarSmsProviderImpl implements SmsProvider {
  name = "KAVENEGAR"
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.KAVENEGAR_API_KEY || ""
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0)
  }

  private getTimeoutMs(): number {
    return Math.max(1000, parseInt(process.env.SMS_TIMEOUT_MS || "8000", 10) || 8000)
  }

  private isPermanentKavenegarStatus(statusCode: number): boolean {
    // 4xx provider errors other than 429 are client/parameter/config issues (not transient)
    return statusCode >= 400 && statusCode < 500 && statusCode !== 429
  }

  private evaluateResponse(
    operation: string,
    httpRes: Awaited<ReturnType<typeof fetchJsonWithTimeout<KavenegarJson>>>
  ): SmsSendResult {
    const corr = httpRes.correlationId

    if (!httpRes.ok || !httpRes.data) {
      const kStatus = httpRes.data?.return?.status
      const rawErr = httpRes.data?.return?.message || httpRes.errorMessage || "خطا در ارتباط با سرویس پیامک"
      const isTransient = kStatus === 429 || httpRes.isRetryable
      const isUncertain = httpRes.failureCategory === "TIMEOUT" || httpRes.failureCategory === "INVALID_JSON"

      logProviderTelemetry({
        provider: this.name,
        operation,
        correlationId: corr,
        durationMs: httpRes.durationMs,
        responseStatus: kStatus ?? httpRes.httpStatus,
        failureCategory: httpRes.failureCategory,
        finalState: isUncertain ? "UNKNOWN" : isTransient ? "RETRY_PENDING" : "FAILED",
        errorSummary: rawErr,
      })

      return {
        success: false,
        error: sanitizeTelemetryText(rawErr),
        failureCategory: httpRes.failureCategory,
        isRetryable: isTransient,
        isUncertain,
        providerStatus: kStatus ?? httpRes.httpStatus,
        correlationId: corr,
        durationMs: httpRes.durationMs,
        deliveryNote: isUncertain ? "UNCERTAIN" : "REJECTED_OR_FAILED",
      }
    }

    const retStatus = httpRes.data.return?.status
    const retMessage = httpRes.data.return?.message
    const messageId = httpRes.data.entries?.[0]?.messageid

    if (retStatus === 200) {
      logProviderTelemetry({
        provider: this.name,
        operation,
        correlationId: corr,
        durationMs: httpRes.durationMs,
        responseStatus: 200,
        failureCategory: "OK",
        finalState: "SENT",
      })
      return {
        success: true,
        messageId: messageId !== undefined ? String(messageId) : undefined,
        failureCategory: "OK",
        isRetryable: false,
        isUncertain: false,
        providerStatus: 200,
        correlationId: corr,
        durationMs: httpRes.durationMs,
        deliveryNote: "ACCEPTED_BY_PROVIDER",
      }
    }

    const numericStatus = typeof retStatus === "number" ? retStatus : -1
    const isRetryable = numericStatus === 429 || numericStatus >= 500 || numericStatus === -1
    const failureCategory: FailureCategory = numericStatus === 429 ? "HTTP_429" : "PROVIDER_ERROR"
    const cleanErr = sanitizeTelemetryText(retMessage || `خطای کاوه‌نگار (${numericStatus})`)

    logProviderTelemetry({
      provider: this.name,
      operation,
      correlationId: corr,
      durationMs: httpRes.durationMs,
      responseStatus: numericStatus,
      failureCategory,
      finalState: isRetryable ? "RETRY_PENDING" : "FAILED",
      errorSummary: cleanErr,
    })

    return {
      success: false,
      error: cleanErr,
      failureCategory,
      isRetryable: !this.isPermanentKavenegarStatus(numericStatus) && isRetryable,
      isUncertain: false,
      providerStatus: numericStatus,
      correlationId: corr,
      durationMs: httpRes.durationMs,
      deliveryNote: "REJECTED_OR_FAILED",
    }
  }

  private async executeSendSms(operation: string, phone: string, message: string): Promise<SmsSendResult> {
    const correlationId = generateCorrelationId("kav")
    if (!this.isConfigured()) {
      logProviderTelemetry({
        provider: this.name,
        operation,
        correlationId,
        durationMs: 0,
        responseStatus: null,
        failureCategory: "CONFIG_ERROR",
        finalState: "FAILED",
        errorSummary: "Missing KAVENEGAR_API_KEY",
      })
      return {
        success: false,
        error: "کلید سرویس پیامک کاوه‌نگار تنظیم نشده است",
        failureCategory: "CONFIG_ERROR",
        isRetryable: false,
        isUncertain: false,
        correlationId,
        durationMs: 0,
        deliveryNote: "REJECTED_OR_FAILED",
      }
    }

    const normalized = normalizeIranianPhone(phone)
    if (!isValidIranianPhone(normalized)) {
      return {
        success: false,
        error: "شماره موبایل گیرنده معتبر نیست",
        failureCategory: "HTTP_4XX",
        isRetryable: false,
        isUncertain: false,
        correlationId,
        durationMs: 0,
        deliveryNote: "REJECTED_OR_FAILED",
      }
    }

    const url = `https://api.kavenegar.com/v1/${encodeURIComponent(this.apiKey)}/sms/send.json`
    const httpRes = await fetchJsonWithTimeout<KavenegarJson>(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        receptor: normalized,
        sender: process.env.KAVENEGAR_SENDER || "",
        message,
      }),
      timeoutMs: this.getTimeoutMs(),
      provider: this.name,
      operation,
      correlationId,
    })

    return this.evaluateResponse(operation, httpRes)
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    const correlationId = generateCorrelationId("kav")
    if (!this.isConfigured()) {
      logProviderTelemetry({
        provider: this.name,
        operation: "sendOtp",
        correlationId,
        durationMs: 0,
        responseStatus: null,
        failureCategory: "CONFIG_ERROR",
        finalState: "FAILED",
        errorSummary: "Missing KAVENEGAR_API_KEY",
      })
      return {
        success: false,
        error: "کلید سرویس پیامک کاوه‌نگار تنظیم نشده است",
        failureCategory: "CONFIG_ERROR",
        isRetryable: false,
        isUncertain: false,
        correlationId,
        durationMs: 0,
        deliveryNote: "REJECTED_OR_FAILED",
      }
    }

    const normalized = normalizeIranianPhone(phone)
    const template = process.env.KAVENEGAR_OTP_TEMPLATE || "verify"
    const qs = new URLSearchParams({
      receptor: normalized,
      token: code,
      template,
    })
    const url = `https://api.kavenegar.com/v1/${encodeURIComponent(this.apiKey)}/verify/lookup.json?${qs.toString()}`

    const httpRes = await fetchJsonWithTimeout<KavenegarJson>(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      timeoutMs: this.getTimeoutMs(),
      provider: this.name,
      operation: "sendOtp",
      correlationId,
    })

    return this.evaluateResponse("sendOtp", httpRes)
  }

  async sendBookingConfirmation(phone: string, summary: BookingSummary): Promise<SmsSendResult> {
    const message = `کوروش باربر\nنوبت شما با موفقیت ثبت شد.\nخدمت: ${summary.serviceName}\nتاریخ: ${summary.jalaliDate}\nساعت: ${summary.time}\nکد پیگیری: ${summary.trackingCode}\nمشتاق دیدارتون هستیم.`
    return this.executeSendSms("sendBookingConfirmation", phone, message)
  }

  async sendReminder(phone: string, summary: BookingSummary): Promise<SmsSendResult> {
    const message = `یادآوری نوبت کوروش باربر\nساعت ${summary.time} در تاریخ ${summary.jalaliDate} منتظر دیدار شما هستیم.\nکد پیگیری: ${summary.trackingCode}`
    return this.executeSendSms("sendReminder", phone, message)
  }

  async sendBirthdayGreeting(phone: string, customerName?: string): Promise<SmsSendResult> {
    const message = `کوروش باربر\n${customerName ? `${customerName} عزیز، ` : ""}تولدت مبارک! 🎉\nامیدواریم سال جدید زندگیت پر از اتفاق‌های خوب، سلامتی و موفقیت باشه.\nخوشحالیم که همراه کوروش باربر هستی.`
    return this.executeSendSms("sendBirthdayGreeting", phone, message)
  }

  async sendCustomSms(phone: string, message: string): Promise<SmsSendResult> {
    return this.executeSendSms("sendCustomSms", phone, message)
  }
}

export const MockSmsProvider = MockSmsProviderImpl
export const KavenegarSmsProvider = KavenegarSmsProviderImpl

export function getSmsProvider(): SmsProvider {
  const mode = process.env.SMS_PROVIDER || "MOCK"
  if (mode.toUpperCase() === "KAVENEGAR" && process.env.KAVENEGAR_API_KEY) {
    return new KavenegarSmsProviderImpl()
  }
  return new MockSmsProviderImpl()
}

export function getProviderStatus(): { name: string; isConfigured: boolean; mode: string } {
  const provider = getSmsProvider()
  const mode = process.env.SMS_PROVIDER || "MOCK"
  return {
    name: provider.name,
    isConfigured: provider.isConfigured(),
    mode: mode.toUpperCase(),
  }
}
