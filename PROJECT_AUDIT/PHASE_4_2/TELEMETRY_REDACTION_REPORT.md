# Telemetry & PII Redaction Hardening Report (`OBS-41-01`)

## 1. Enhancement Summary

Extended [`sanitizeTelemetryText()`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts#L43-L70) inside [`lib/http.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts) to harden every provider diagnostic error string, exception message, and `NotificationJob.error` summary against accidental exposure of sensitive URLs, credentials, OTP codes, payment secrets, or Iranian customer phone numbers.

## 2. Redaction Patterns Enforced

| Category | Pattern Handled | Replacement |
|---|---|---|
| Percent-encoded payloads | Safe `decodeURIComponent()` when `%[0-9A-Fa-f]{2}` is detected (graceful fallback on malformed sequences) | Decoded before regex masking |
| Kavenegar URL API Key path | `/v1/<key>/` (case-insensitive) | `/v1/[REDACTED]/` |
| Query / delimited parameters | `receptor`, `mobile`, `phone`, `token`, `token2`, `token3`, `code`, `otp`, `apiKey`, `api_key`, `merchant_id`, `merchantId`, `secret`, `password` (case-insensitive) | `<key>=[REDACTED]` |
| JSON string fields | Same keys plus `cardPan` / `card_pan` in JSON payloads | `"key":"[REDACTED]"` |
| Auth headers | `Bearer <token>` and `x-api-key: <value>` (or `x-api-key=<value>`) | `Bearer [REDACTED]` / `x-api-key: [REDACTED]` |
| Iranian phone numbers | `(?:\+98|0098|(?<!\d)0)9\d{9}(?!\d)` across text | `[PHONE_REDACTED]` |
| Maximum stored length | `.slice(0, 400)` in sanitizer (`500` chars max in `formatJobDiagnostic`) | Bounded storage |

## 3. Observed Test Verification

Verified directly by **Section D** in [`test/phase4_2_hardening.test.ts`](file:///c:/Users/blue/Documents/projects/barber/test/phase4_2_hardening.test.ts#L475-L515) on both SQLite and PostgreSQL 16.16:
- Tested raw Kavenegar lookup URLs with `receptor=09129876543&token=482910` and `/v1/MY-SUPER-SECRET-KAVE-KEY/`.
- Tested URL-encoded (`https%3A%2F%2F...%3FRECEPTOR%3D%2B989129876543%26Token%3D778899%26api_key%3DmyApiSecret99`).
- Tested mixed headers & JSON (`Authorization: Bearer ...`, `x-api-key`, `merchant_id`, `code`, `password`).
- Tested standalone Iranian phone numbers (`+989121112233`, `00989123334455`, `09351234567`, `mobile=09120001122`).
- **Observed Result:** Zero forbidden secrets or phone numbers remained (`leaked.length === 0`); redaction markers `[REDACTED]` and `[PHONE_REDACTED]` confirmed present (**2/2 Section D assertions PASS**).
