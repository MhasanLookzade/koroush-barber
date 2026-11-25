import crypto from "crypto"

export type FailureCategory =
  | "OK"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "HTTP_429"
  | "HTTP_4XX"
  | "HTTP_5XX"
  | "INVALID_JSON"
  | "PROVIDER_ERROR"
  | "CONFIG_ERROR"

export interface SafeHttpResult<T = unknown> {
  ok: boolean
  httpStatus: number | null
  data: T | null
  rawTextSnippet?: string
  failureCategory: FailureCategory
  isRetryable: boolean
  isUncertain: boolean
  errorMessage?: string
  correlationId: string
  durationMs: number
}

export interface TelemetryEvent {
  provider: string
  operation: string
  correlationId: string
  durationMs: number
  attempt?: number
  responseStatus: number | string | null
  failureCategory: FailureCategory
  finalState: string
  errorSummary?: string
}

/**
 * Redact API keys, OTP tokens, phone numbers, receptor params, payment secrets, and bearer credentials
 * (including URL-encoded and mixed-case variants) before logging or persisting.
 */
export function sanitizeTelemetryText(input: string): string {
  if (!input) return ""

  // Decode valid percent-encoded spans individually so an unrelated literal '%' cannot abort decoding
  const text = input.replace(/(?:%[0-9A-Fa-f]{2})+/g, (segment) => {
    try {
      return decodeURIComponent(segment)
    } catch {
      return segment
    }
  })

  return text
    .replace(/\/v1\/[^/\s]+\//gi, "/v1/[REDACTED]/")
    .replace(
      /([?&\s]|^)(receptor|mobile|phone|token|token2|token3|code|otp|apiKey|api_key|merchant_id|merchantId|secret|password)=([^&\s]+)/gi,
      "$1$2=[REDACTED]"
    )
    .replace(
      /("(?:receptor|mobile|phone|token|token2|token3|code|otp|apiKey|api_key|merchant_id|merchantId|secret|password|cardPan|card_pan)"\s*:\s*")([^"\r\n]+)("?)/gi,
      '$1[REDACTED]$3'
    )
    .replace(
      /("(?:receptor|mobile|phone|token|token2|token3|code|otp|apiKey|api_key|merchant_id|merchantId|secret|password|cardPan|card_pan)"\s*:\s*)(\d+)/gi,
      "$1[REDACTED]"
    )
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, "$1[REDACTED]")
    .replace(/(x-api-key\s*[:=]\s*)([^\s,;]+)/gi, "$1[REDACTED]")
    .replace(/(?:\+98|0098|(?<!\d)0)9\d{9}(?!\d)/g, "[PHONE_REDACTED]")
    .slice(0, 400)
}

/**
 * Safely extract and redact nested Error objects, causes, upstream response payloads, or URLs
 * without ever exposing receptor phone numbers, OTP codes, API keys, or secrets.
 */
export function sanitizeTelemetryInput(
  input: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): string {
  if (input === null || input === undefined) return ""
  if (typeof input === "string") return sanitizeTelemetryText(input)
  if (typeof input === "number" || typeof input === "boolean") return String(input)
  if (depth > 3) return "[Truncated]"

  const parts: string[] = []
  if (input instanceof Error) {
    if (seen.has(input)) return "[CircularError]"
    seen.add(input)
    parts.push(`${input.name || "Error"}: ${input.message || ""}`)
    const withCause = input as Error & { cause?: unknown; code?: unknown; url?: unknown }
    if (withCause.code) parts.push(`errCode=${String(withCause.code)}`)
    if (withCause.url) parts.push(`url=${String(withCause.url)}`)
    if (withCause.cause !== undefined) {
      parts.push(`cause=(${sanitizeTelemetryInput(withCause.cause, depth + 1, seen)})`)
    }
    return sanitizeTelemetryText(parts.join(" | "))
  }

  if (typeof input === "object") {
    const obj = input as Record<string, unknown>
    if (seen.has(obj)) return "[Circular]"
    seen.add(obj)
    if (Array.isArray(obj)) {
      return sanitizeTelemetryText(
        `[${obj.slice(0, 5).map((item) => sanitizeTelemetryInput(item, depth + 1, seen)).join(", ")}]`
      )
    }
    const sensitiveKey =
      /^(receptor|mobile|phone|token|token2|token3|code|otp|apikey|api_key|merchant_id|merchantid|secret|password|cardpan|card_pan|authorization|x-api-key)$/i
    const kv = Object.entries(obj)
      .slice(0, 12)
      .map(([k, v]) => {
        if (k.toLowerCase() === "code" && typeof v === "string" && /^(E[A-Z0-9_]{2,}|UND_ERR_[A-Z0-9_]+)$/.test(v)) {
          return `errCode=${v}`
        }
        if (sensitiveKey.test(k)) return `${k}=[REDACTED]`
        if (v !== null && typeof v === "object") {
          return `${k}=${sanitizeTelemetryInput(v, depth + 1, seen)}`
        }
        return `${k}=${sanitizeTelemetryText(String(v))}`
      })
    return sanitizeTelemetryText(kv.join(" "))
  }

  return sanitizeTelemetryText(String(input))
}

export function generateCorrelationId(prefix = "ext"): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 12)}`
}

export function logProviderTelemetry(event: TelemetryEvent): void {
  const sanitized = {
    ...event,
    ...(event.errorSummary ? { errorSummary: sanitizeTelemetryText(event.errorSummary) } : {}),
  }
  const line = `[Telemetry][${sanitized.provider}] op=${sanitized.operation} corr=${sanitized.correlationId} durMs=${sanitized.durationMs} att=${sanitized.attempt ?? 1} status=${sanitized.responseStatus ?? "NONE"} cat=${sanitized.failureCategory} state=${sanitized.finalState}${sanitized.errorSummary ? ` err="${sanitized.errorSummary}"` : ""}`
  if (sanitized.failureCategory === "OK") {
    console.info(line)
  } else {
    console.warn(line)
  }
}

/**
 * Bounded-timeout HTTP + safe JSON fetch wrapper for external payment and SMS gateways.
 * Never throws raw fetch/JSON parsing errors; returns structured classification and timing.
 */
export async function fetchJsonWithTimeout<T = unknown>(
  url: string,
  options: RequestInit & {
    timeoutMs?: number
    provider?: string
    operation?: string
    correlationId?: string
  } = {}
): Promise<SafeHttpResult<T>> {
  const {
    timeoutMs = 10000,
    provider = "HTTP",
    operation = "request",
    correlationId = generateCorrelationId(provider.toLowerCase()),
    signal: callerSignal,
    ...fetchInit
  } = options

  const startedAt = Date.now()

  try {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const combinedSignal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal

    const response = await fetch(url, {
      ...fetchInit,
      signal: combinedSignal,
    })

    const durationMs = Date.now() - startedAt
    let rawText = ""
    try {
      rawText = await response.text()
    } catch (readErr: unknown) {
      const msg = readErr instanceof Error ? readErr.message : "Failed reading response body"
      return {
        ok: false,
        httpStatus: response.status,
        data: null,
        failureCategory: "NETWORK_ERROR",
        isRetryable: true,
        isUncertain: true,
        errorMessage: sanitizeTelemetryText(msg),
        correlationId,
        durationMs,
      }
    }

    let parsed: T | null = null
    if (rawText.trim().length > 0) {
      try {
        parsed = JSON.parse(rawText) as T
      } catch {
        const snippet = sanitizeTelemetryText(rawText.replace(/\s+/g, " ").trim().slice(0, 140))
        const statusCat: FailureCategory =
          response.status === 429
            ? "HTTP_429"
            : response.status >= 500
              ? "HTTP_5XX"
              : "INVALID_JSON"
        return {
          ok: false,
          httpStatus: response.status,
          data: null,
          rawTextSnippet: snippet,
          failureCategory: statusCat,
          isRetryable: true,
          isUncertain: response.ok || response.status >= 500,
          errorMessage: `پاسخ نامعتبر غیرJSON از سرویس خارجی (HTTP ${response.status})`,
          correlationId,
          durationMs,
        }
      }
    }

    if (!response.ok) {
      const failureCategory: FailureCategory =
        response.status === 429
          ? "HTTP_429"
          : response.status >= 500
            ? "HTTP_5XX"
            : "HTTP_4XX"
      const isRetryable = response.status === 429 || response.status >= 500
      return {
        ok: false,
        httpStatus: response.status,
        data: parsed,
        failureCategory,
        isRetryable,
        isUncertain: response.status >= 500 || response.status === 429,
        errorMessage: `خطای HTTP ${response.status} از سرویس خارجی`,
        correlationId,
        durationMs,
      }
    }

    if (parsed === null) {
      return {
        ok: false,
        httpStatus: response.status,
        data: null,
        failureCategory: "INVALID_JSON",
        isRetryable: true,
        isUncertain: true,
        errorMessage: "پاسخ خالی از سرویس خارجی دریافت شد",
        correlationId,
        durationMs,
      }
    }

    return {
      ok: true,
      httpStatus: response.status,
      data: parsed,
      failureCategory: "OK",
      isRetryable: false,
      isUncertain: false,
      correlationId,
      durationMs,
    }
  } catch (err: unknown) {
    const durationMs = Date.now() - startedAt
    const errName = err instanceof Error ? err.name : ""
    const errDetail = sanitizeTelemetryInput(err)
    const isTimeout =
      errName === "TimeoutError" ||
      errName === "AbortError" ||
      /timeout|aborted/i.test(errDetail)

    return {
      ok: false,
      httpStatus: null,
      data: null,
      failureCategory: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      isRetryable: true,
      isUncertain: true,
      errorMessage: isTimeout
        ? `پایان مهلت انتظار اتصال به ${provider} (${timeoutMs}ms)`
        : sanitizeTelemetryText(`خطای شبکه در ارتباط با ${provider}: ${errDetail}`),
      correlationId,
      durationMs,
    }
  }
}
