# Phase 4.1 — ZarinPal Payment Reliability Review

**Branch:** `fix/phase-4-reliability-notifications`  
**Backup Reference:** `backup/pre-phase-4` (`0e95123e1a206e1b6dbf66d11d383e242d40012b`)  
**Inspected Files:** [`lib/http.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts), [`lib/providers/payment.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/payment.ts), [`lib/booking-engine.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts)

---

## 1. ZarinPal Timeout, HTTP Guard & Uncertainty Verification

- **Initiation (`initiatePayment`):** Uses `fetchJsonWithTimeout` (`10000` ms default `AbortSignal.timeout`) with zero automatic retries. Timeout, HTTP 5xx, 4xx, network error, or invalid JSON throws cleanly before any `Payment` row is written in `POST /api/booking/pay`.
- **Verification (`verifyPayment` + `handlePaymentCallback`):**
  - Calls `gateway.verifyPayment` strictly **outside** `prisma.$transaction`.
  - Distinguishes **definitive bank rejections** (`isUncertain: false`, e.g., ZarinPal non-100/101 business code or 4xx JSON `{ errors: { code } }`) from **uncertain/transient faults** (`isUncertain: true`: `TIMEOUT`, `NETWORK_ERROR`, `HTTP_5XX`, `HTTP_429`, `INVALID_JSON`, or missing `ref_id` on code `100`/`101`).
  - When `isUncertain: true`, `handlePaymentCallback()` updates `Payment.errorCode`/`errorMessage` while keeping `Payment.status = "PENDING"` and `Appointment` untouched (`HELD` / `AWAITING_PAYMENT`) — never falsely confirming or cancelling the booking.
  - Once ZarinPal recovers, re-invoking `/api/booking/callback` confirms `CONFIRMED` cleanly (or moves to `PAYMENT_REVIEW` if the hold expired in the meantime), and subsequent duplicate callbacks return `isIdempotentRepeat: true`.

---

## 2. Classified Findings

| ID | Finding | Status | Notes |
|---|---|---|---|
| PAY-41-01 | Missing HTTP timeout / non-JSON / HTML 502 crash on ZarinPal (`REL-001`) | **Not Found** | Closed cleanly via `fetchJsonWithTimeout` (`25/25` Phase 4 assertions passing). |
| PAY-41-02 | Blind payment initiation retry issuing duplicate ZarinPal authorities | **Not Found** | Verified single attempt (`initiateCalls === 1` on timeout). |
| PAY-41-03 | Uncertain verification confirming or cancelling an unsettled payment | **Not Found** | Preserves `Payment = PENDING` and allows safe recovery/reconciliation. |

---

## 3. Verdict

- **Status:** **PASS**
