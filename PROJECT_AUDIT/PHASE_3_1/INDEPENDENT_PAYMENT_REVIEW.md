# Phase 3.1 — Independent Payment & Financial Integrity Review

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Backup Baseline:** `backup/pre-phase-3` (`43023c5dffeaab6eae3566214099224741b90ab7`)  
**Verification Mode:** Read-only code inspection + live PostgreSQL 16.16 execution (no source files modified)

---

## 1. End-to-End Financial Trace

1. **Deposit Calculation ([`computeServiceDeposit`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts#L38-L62)):**
   - Rejects non-finite or negative `price`.
   - `depositType === "percentage"`: requires `depositPercent` in `[0, 100]` (`null`/`undefined`/`NaN`/`<0`/`>100` throws); returns `Math.round((price * pct) / 100)` (integer Tomans).
   - `depositType === "fixed"`: requires `depositPrice >= 0`; returns `Math.min(price, Math.round(depositPrice))`.
   - Rejects unknown `depositType` values.

2. **Hold Creation (`reserveSlotHold`):**
   - Computes `totalPrice = Math.round(service.price)`, `depositAmount = computeServiceDeposit(service)`, `balanceDue = Math.max(0, totalPrice - depositAmount)`.
   - Persists `totalPrice`, `depositPaid: 0`, and `balanceDue` on `Appointment`.

3. **Payment Initiation ([`POST /api/booking/pay`](file:///c:/Users/blue/Documents/projects/barber/app/api/booking/pay/route.ts#L114-L162)):**
   - Computes `lockedDeposit = Math.max(0, Math.round(appointment.totalPrice - appointment.balanceDue))` (falling back to `computeServiceDeposit(appointment.service)` only if `lockedDeposit <= 0`).
   - Rejects `depositAmount <= 0` with HTTP `400`.
   - Completely ignores any client-supplied amount fields (e.g., `amountToman` in POST JSON body).
   - Passes `amountToman: depositAmount` to `gateway.initiatePayment()` (`ZarinPalPaymentGatewayImpl` converts via integer multiplication `Math.round(params.amountToman) * 10` for `IRR` Rials) and records `amountToman` + `amountToman * 10` in `Payment`.

4. **Callback & Final Confirmation (`handlePaymentCallback`):**
   - Verifies with gateway using `payment.amountToman` (`Payment` row from DB).
   - Confirms with `depositPaid = freshPayment.amountToman` and `balanceDue = Math.max(0, app.totalPrice - freshPayment.amountToman)`.

---

## 2. Classified Findings

| ID | Finding | Status | Severity | Notes |
|---|---|---|---|---|
| PAY-31-01 | Percentage deposit mismatch (`BUG-001`) | **Not Found** | — | Verified fixed: 30% of 450,000 charges `135,000` Toman (`1,350,000` Rial) even with stale `depositPrice=50000`. |
| PAY-31-02 | Client-side payment amount manipulation | **Not Found** | — | Client `amountToman: 1000` is ignored; server charges `135,000`. |
| PAY-31-03 | Invalid/missing deposit configuration silent fallback | **Not Found** | — | Invalid percentages (`>100`, `null`), unknown `depositType`, and zero online deposit (`<=0` at `/pay`) are rejected cleanly. |
| PAY-31-04 | Admin manual booking `POST /api/admin/appointments` percentage gap | **Confirmed** | Low | `app/api/admin/appointments/route.ts` line 151 uses `service.depositPrice` directly for manual walk-in/admin bookings instead of `computeServiceDeposit(service)`. Does not affect online customer payment engine, noted for completeness. |
| PAY-31-05 | Repeated concurrent `/api/booking/pay` before callback | **Confirmed** | Informational | Opening two `/pay` requests while `HELD`/`AWAITING_PAYMENT` creates two `PENDING` `Payment` authorities; if both were ever verified `OK`, the first confirms the appointment and the second logs `PAYMENT_RECONCILIATION_ALERT` in `AuditLog` with `VERIFIED` `Payment` recorded. |

---

## 3. Verdict

- **Status:** **PASS** — Customer-facing online deposit calculations, server-authoritative pricing, integer Toman/Rial conversions, and tamper resistance are sound and verified.
