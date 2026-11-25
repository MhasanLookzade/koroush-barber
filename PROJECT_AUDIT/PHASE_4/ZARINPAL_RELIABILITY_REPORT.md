# Phase 4 — ZarinPal Gateway Reliability Report (`REL-001`)

**Branch:** `fix/phase-4-reliability-notifications`  
**Target File:** [`lib/providers/payment.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/payment.ts) & [`lib/http.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts)

---

## 1. Hardening Controls Implemented

1. **Bounded Timeouts:** Both `initiatePayment` (`/request.json`) and `verifyPayment` (`/verify.json`) execute via [`fetchJsonWithTimeout`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts#L62-L185) using `AbortSignal.timeout(timeoutMs)` (default `10000` ms).
2. **No Blind Initiation Retries:** `initiatePayment` performs a single bounded HTTP call and surfaces a clean Persian error on timeout/network interruption/HTTP 4xx/5xx/invalid JSON to prevent duplicate ZarinPal authority issuance.
3. **Safe Text/JSON Parsing & HTTP Validation:** Non-JSON gateway responses (e.g., `502 Bad Gateway` HTML or HTTP `200` malformed bodies) are parsed safely without unhandled `SyntaxError` exceptions.
4. **Definitive Rejection vs Uncertain Outcome Separation:**
   - **Definitive Bank Rejection (`isUncertain: false`):** Explicit ZarinPal JSON rejection code (non-100/101 business code or 4xx JSON `{ errors: { code } }` excluding 429) or `gatewayStatus === "NOK"`. Transitions `Payment` -> `FAILED`, `Appointment` -> `CANCELLED`, `SlotHold` -> `RELEASED`.
   - **Uncertain Outcome (`isUncertain: true`):** `TIMEOUT`, `NETWORK_ERROR`, `HTTP_5XX`, `HTTP_429`, `INVALID_JSON`, missing `ref_id` on code `100`/`101`, or thrown fetch error. Leaves `Payment` in `PENDING`, preserves appointment/hold state, and NEVER confirms or cancels blindly.
5. **Telemetry Without Secret Leakage:** Emits `[Telemetry][ZARINPAL]` with `op`, `corr`, `durMs`, `att`, `status`, `cat`, `state`, and sanitized error summary (never logging `merchant_id` or card details).

---

## 2. Verified Failure Matrix (`test/phase4_reliability_notifications.test.ts`)

| ZarinPal Fault Scenario | Classified Result | DB State Preserved? |
|---|---|---|
| `initiatePayment` timeout | Throws error after `1` bounded attempt (no retry) | Yes (zero `Payment` row created) |
| `verifyPayment` timeout | `success=false`, `isUncertain=true`, `cat=TIMEOUT` | Yes (`Payment` stays `PENDING`, `Appointment` stays `HELD`) |
| HTTP `502` HTML response | `success=false`, `isUncertain=true`, `cat=HTTP_5XX` | Yes (no `SyntaxError`, `PENDING`) |
| HTTP `200` non-JSON body | `success=false`, `isUncertain=true`, `cat=INVALID_JSON` | Yes (`PENDING`) |
| HTTP `400` `{ errors: { code: -50 } }` | `success=false`, `isUncertain=false` | Yes (transitions `FAILED`/`CANCELLED`/`RELEASED`) |
| Network disconnect (`ECONNRESET`) | `success=false`, `isUncertain=true`, `cat=NETWORK_ERROR` | Yes (`PENDING`) |
| Gateway recovers & duplicate `OK` | 1st confirms `CONFIRMED`; 2nd returns `isIdempotentRepeat=true` | Yes |
