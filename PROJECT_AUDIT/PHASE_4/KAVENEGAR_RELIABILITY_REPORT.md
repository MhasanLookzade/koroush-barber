# Phase 4 — Kavenegar SMS Provider Reliability Report (`REL-001`)

**Branch:** `fix/phase-4-reliability-notifications`  
**Target File:** [`lib/providers/sms.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/sms.ts)

---

## 1. Hardening Controls Implemented

1. **Bounded Timeouts & Safe JSON Guards:** Every Kavenegar endpoint (`/verify/lookup.json` and `/sms/send.json`) calls [`fetchJsonWithTimeout`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts#L62-L185) (`8000` ms default) and validates both `response.ok` and `data.return?.status === 200`.
2. **URL Encoding Fix (`sendOtp`):** Replaced string-interpolated URL params with `URLSearchParams({ receptor, token, template })` and `encodeURIComponent(this.apiKey)`.
3. **Failure Classification & Retryability:**
   - `TIMEOUT`, `NETWORK_ERROR`, `HTTP_429`, `HTTP_5XX`, `INVALID_JSON` -> `isRetryable: true`.
   - `TIMEOUT` and `INVALID_JSON` -> `isUncertain: true` (terminal state on retry exhaustion becomes `UNKNOWN` rather than `FAILED`).
   - `CONFIG_ERROR` and non-429 4xx/validation errors -> `isRetryable: false` (immediately terminal `FAILED`).
4. **Provider Acceptance vs Handset Delivery:**
   - Kavenegar HTTP `200` (`return.status === 200` with `entries[0].messageid`) confirms **provider queue acceptance** (`deliveryNote: "ACCEPTED_BY_PROVIDER"`), not confirmed mobile handset receipt (which would require async webhook/status polling).
5. **Secret & OTP Sanitization:** [`sanitizeTelemetryText`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts#L34-L41) redacts `/v1/<apiKey>/` path segments, `token=<OTP>`, and `Bearer` headers across all logs and stored `NotificationJob.error` diagnostics.
6. **OTP Failure Surface (`app/api/booking/otp/send/route.ts`):** Rejects failed OTP dispatches with HTTP `503` rather than falsely claiming the OTP SMS was sent.
