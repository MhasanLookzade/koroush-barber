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
 * Redact API keys, OTP tokens, and credentials from strings before logging or persisting.
 */
export function sanitizeTelemetryText(input: string): string {
  if (!input) return ""
  return input
    .replace(/\/v1\/[^/\s]+\//gi, "/v1/[REDACTED]/")
    .replace(/([?&](?:token|token2|token3|code|apiKey|apikey|merchant_id)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, "$1[REDACTED]")
    .slice(0, 300)
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
    const errMsg = err instanceof Error ? err.message : "Network failure"
    const isTimeout =
      errName === "TimeoutError" ||
      errName === "AbortError" ||
      /timeout|aborted/i.test(errMsg)

    return {
      ok: false,
      httpStatus: null,
      data: null,
      failureCategory: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      isRetryable: true,
      isUncertain: true,
      errorMessage: isTimeout
        ? `پایان مهلت انتظار اتصال به ${provider} (${timeoutMs}ms)`
        : sanitizeTelemetryText(`خطای شبکه در ارتباط با ${provider}: ${errMsg}`),
      correlationId,
      durationMs,
    }
  }
}
