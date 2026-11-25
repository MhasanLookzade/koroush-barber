# Phase 4.1 — Observability & Security Audit

**Branch:** `fix/phase-4-reliability-notifications`  
**Inspected Files:** [`lib/http.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts), [`lib/providers/payment.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/payment.ts), [`lib/providers/sms.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/sms.ts), [`lib/notifications.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts)

---

## 1. Operational Telemetry & Redaction Inspection

- Every external gateway/SMS operation emits structured `[Telemetry][<PROVIDER>]` records via [`logProviderTelemetry()`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts#L47-L60) including:
  - Provider (`ZARINPAL`, `KAVENEGAR`, `MOCK`)
  - Operation (`initiatePayment`, `verifyPayment`, `sendOtp`, `notification:<type>`, etc.)
  - Correlation ID (`zp_*`, `kav_*`, `notif_*`)
  - Duration (`durMs`), attempt (`att`), response status, failure category, and final state.
- **Sensitive Data Check:**
  - `sanitizeTelemetryText()` redacts `/v1/<API_KEY>/` path segments, `token=`, `code=`, `apiKey=`, `merchant_id=`, and `Bearer` headers across all logs and stored `NotificationJob.error` fields.
  - Telemetry format logs zero customer names, zero customer phone numbers, zero `cardPan` numbers, zero ZarinPal `merchant_id`s, and zero OTP codes.
  - Note (`OBS-41-01` — Low): `sanitizeTelemetryText()` masks `/v1/<key>/` and `token=` query params; adding `&receptor=` masking would be defense-in-depth if any upstream fetch error echoed the full `verify/lookup.json` URL (though `verify/lookup.json` errors in `fetchJsonWithTimeout` currently use generic category strings rather than the full request URL).

---

## 2. Verdict

- **Status:** **PASS** — Operational diagnostics provide full correlation/duration/category visibility without exposing API secrets, OTP codes, payment credentials, or customer PII.
