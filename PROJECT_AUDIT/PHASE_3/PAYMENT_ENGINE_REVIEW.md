# Phase 3 — Payment Engine & Financial Integrity Review

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Scope:** `BUG-001`, `BUG-005`, [`lib/booking-engine.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts), [`app/api/booking/pay/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/booking/pay/route.ts), [`lib/providers/payment.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/payment.ts), [`app/api/booking/callback/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/booking/callback/route.ts)

---

## 1. Root Cause of `BUG-001` (Percentage Deposit Mismatch)

- **Before Phase 3:**
  - `reserveSlotHold()` computed percentage deposits when `depositType === "percentage" && service.depositPercent`, storing `balanceDue = totalPrice - depositAmount` on `Appointment`.
  - `POST /api/booking/pay` ignored `depositType`, `depositPercent`, and `appointment.balanceDue`, instead reading `appointment.service.depositPrice || 50000`.
  - Consequently, percentage-based services charged the stale `depositPrice` (or `50,000` Tomans) at ZarinPal while `Appointment.balanceDue` expected the percentage deposit.

- **After Phase 3:**
  - [`computeServiceDeposit()`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts#L38-L62) is the single authoritative integer-Toman deposit calculator for both `fixed` and `percentage` services, rejecting invalid/missing percentages (`< 0`, `> 100`, `null`/`NaN`) and unknown `depositType` values.
  - `POST /api/booking/pay` computes `lockedDeposit = Math.max(0, Math.round(appointment.totalPrice - appointment.balanceDue))` (the exact deposit locked when the hold was created), falling back to `computeServiceDeposit(appointment.service)` only if needed, and rejects `depositAmount <= 0` with HTTP `400`.
  - Client-supplied monetary values (e.g., `amountToman` in request body) are completely ignored.

---

## 2. End-to-End Financial Invariants Verified

1. **Hold Creation (`reserveSlotHold`):** `totalPrice = Math.round(service.price)`, `depositAmount = computeServiceDeposit(service)`, `balanceDue = Math.max(0, totalPrice - depositAmount)`, `depositPaid = 0`.
2. **Payment Initiation (`POST /api/booking/pay`):** `amountToman = lockedDeposit`, `amountRial = amountToman * 10` (converted in integer Tomans/Rials, also enforced in [`ZarinPalPaymentGatewayImpl`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/payment.ts#L136)).
3. **Gateway Verification (`handlePaymentCallback`):** Calls `gateway.verifyPayment({ authority, amountToman: payment.amountToman })` **outside** the database transaction.
4. **Confirmation (`tx.appointment.update`):** Sets `depositPaid = freshPayment.amountToman` and `balanceDue = Math.max(0, app.totalPrice - freshPayment.amountToman)`.
5. **Failed / Cancelled Payment (`NOK` or `!verification.success`):** Marks `Payment` `FAILED`, cancels `HELD`/`AWAITING_PAYMENT` appointment, and releases the customer's `ACTIVE` `SlotHold`.
