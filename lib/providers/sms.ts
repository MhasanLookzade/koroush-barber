/**
 * Koroush Barber — Iranian SMS & OTP Provider Architecture
 * Supports Mock provider (development/testing) and Kavenegar (production)
 */

export interface BookingSummary {
  trackingCode: string
  serviceName: string
  jalaliDate: string
  time: string
  depositPaid?: number
  balanceDue?: number
}

export interface SmsProvider {
  name: string
  isConfigured(): boolean
  sendOtp(phone: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string }>
  sendBookingConfirmation(phone: string, summary: BookingSummary): Promise<{ success: boolean; messageId?: string; error?: string }>
  sendReminder(phone: string, summary: BookingSummary): Promise<{ success: boolean; messageId?: string; error?: string }>
  sendBirthdayGreeting(phone: string, customerName?: string): Promise<{ success: boolean; messageId?: string; error?: string }>
  sendCustomSms(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>
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

  isConfigured(): boolean {
    return true
  }

  async sendOtp(phone: string, code: string) {
    const normalized = normalizeIranianPhone(phone)
    MockSmsProviderImpl.sentOtps.set(normalized, { code, sentAt: new Date() })
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message: `کد تایید کوروش باربر: ${code}`,
      type: "OTP",
      sentAt: new Date(),
    })
    return { success: true, messageId: `mock-otp-${Date.now()}` }
  }

  async sendBookingConfirmation(phone: string, summary: BookingSummary) {
    const normalized = normalizeIranianPhone(phone)
    const text = `کوروش باربر\nنوبت شما با موفقیت ثبت شد.\nخدمت: ${summary.serviceName}\nتاریخ: ${summary.jalaliDate}\nساعت: ${summary.time}\nکد پیگیری: ${summary.trackingCode}\nمشتاق دیدارتون هستیم.`
    
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message: text,
      type: "CONFIRMATION",
      sentAt: new Date(),
    })
    return { success: true, messageId: `mock-conf-${Date.now()}` }
  }

  async sendReminder(phone: string, summary: BookingSummary) {
    const normalized = normalizeIranianPhone(phone)
    const text = `یادآوری نوبت کوروش باربر\nساعت ${summary.time} در تاریخ ${summary.jalaliDate} منتظر دیدار شما هستیم.\nکد پیگیری: ${summary.trackingCode}`
    
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message: text,
      type: "REMINDER",
      sentAt: new Date(),
    })
    return { success: true, messageId: `mock-rem-${Date.now()}` }
  }

  async sendBirthdayGreeting(phone: string, customerName?: string) {
    const normalized = normalizeIranianPhone(phone)
    const text = `کوروش باربر\n${customerName ? `${customerName} عزیز، ` : ""}تولدت مبارک! 🎉\nامیدواریم سال جدید زندگیت پر از اتفاق‌های خوب، سلامتی و موفقیت باشه.\nخوشحالیم که همراه کوروش باربر هستی.`
    
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message: text,
      type: "BIRTHDAY",
      sentAt: new Date(),
    })
    return { success: true, messageId: `mock-bday-${Date.now()}` }
  }

  async sendCustomSms(phone: string, message: string) {
    const normalized = normalizeIranianPhone(phone)
    MockSmsProviderImpl.sentMessages.push({
      phone: normalized,
      message,
      type: "CUSTOM",
      sentAt: new Date(),
    })
    return { success: true, messageId: `mock-custom-${Date.now()}` }
  }

  // Helper for automated testing only
  static getLatestOtp(phone: string): string | null {
    const normalized = normalizeIranianPhone(phone)
    return this.sentOtps.get(normalized)?.code || null
  }

  static clearAll() {
    this.sentOtps.clear()
    this.sentMessages = []
  }
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

  async sendOtp(phone: string, code: string) {
    if (!this.apiKey) {
      return { success: false, error: "Kavenegar API key not configured" }
    }
    const normalized = normalizeIranianPhone(phone)
    try {
      const template = process.env.KAVENEGAR_OTP_TEMPLATE || "verify"
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json?receptor=${normalized}&token=${code}&template=${template}`
      const response = await fetch(url, { method: "GET" })
      const data = await response.json()
      if (data.return?.status === 200) {
        return { success: true, messageId: String(data.entries?.[0]?.messageid) }
      }
      return { success: false, error: data.return?.message || "Kavenegar lookup failed" }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      return { success: false, error: errorMsg }
    }
  }

  async sendBookingConfirmation(phone: string, summary: BookingSummary) {
    if (!this.apiKey) return { success: false, error: "Kavenegar API key not configured" }
    const normalized = normalizeIranianPhone(phone)
    try {
      const message = `کوروش باربر\nنوبت شما با موفقیت ثبت شد.\nخدمت: ${summary.serviceName}\nتاریخ: ${summary.jalaliDate}\nساعت: ${summary.time}\nکد پیگیری: ${summary.trackingCode}\nمشتاق دیدارتون هستیم.`
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          receptor: normalized,
          sender: process.env.KAVENEGAR_SENDER || "",
          message,
        }),
      })
      const data = await response.json()
      return { success: data.return?.status === 200, messageId: String(data.entries?.[0]?.messageid) }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "SMS send failed" }
    }
  }

  async sendReminder(phone: string, summary: BookingSummary) {
    if (!this.apiKey) return { success: false, error: "Kavenegar API key not configured" }
    const normalized = normalizeIranianPhone(phone)
    try {
      const message = `یادآوری نوبت کوروش باربر\nساعت ${summary.time} در تاریخ ${summary.jalaliDate} منتظر دیدار شما هستیم.\nکد پیگیری: ${summary.trackingCode}`
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          receptor: normalized,
          sender: process.env.KAVENEGAR_SENDER || "",
          message,
        }),
      })
      const data = await response.json()
      return { success: data.return?.status === 200 }
    } catch {
      return { success: false }
    }
  }

  async sendBirthdayGreeting(phone: string, customerName?: string) {
    if (!this.apiKey) return { success: false, error: "Kavenegar API key not configured" }
    const normalized = normalizeIranianPhone(phone)
    try {
      const message = `کوروش باربر\n${customerName ? `${customerName} عزیز، ` : ""}تولدت مبارک! 🎉\nامیدواریم سال جدید زندگیت پر از اتفاق‌های خوب، سلامتی و موفقیت باشه.\nخوشحالیم که همراه کوروش باربر هستی.`
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          receptor: normalized,
          sender: process.env.KAVENEGAR_SENDER || "",
          message,
        }),
      })
      const data = await response.json()
      return { success: data.return?.status === 200, messageId: String(data.entries?.[0]?.messageid) }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "SMS send failed" }
    }
  }

  async sendCustomSms(phone: string, message: string) {
    if (!this.apiKey) return { success: false, error: "Kavenegar API key not configured" }
    const normalized = normalizeIranianPhone(phone)
    try {
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          receptor: normalized,
          sender: process.env.KAVENEGAR_SENDER || "",
          message,
        }),
      })
      const data = await response.json()
      return { success: data.return?.status === 200, messageId: String(data.entries?.[0]?.messageid) }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "SMS send failed" }
    }
  }
}

export const MockSmsProvider = MockSmsProviderImpl

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
