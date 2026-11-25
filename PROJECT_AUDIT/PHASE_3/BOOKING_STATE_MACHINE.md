# Phase 3 — Booking & Payment State Machine

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Scope:** Explicit state transitions across `SlotHold`, `Appointment`, and `Payment`

---

## 1. Appointment & Hold Lifecycle Diagram

```mermaid
stateDiagram-v2
    [*] --> HELD : reserveSlotHold() [ACTIVE SlotHold created, 10m TTL]
    HELD --> EXPIRED : Hold TTL elapsed / releaseExpiredHolds() / /pay sees expired hold
    HELD --> CANCELLED : Same-user re-hold OR customer cancellation
    HELD --> AWAITING_PAYMENT : POST /api/booking/pay [Payment=PENDING]

    AWAITING_PAYMENT --> EXPIRED : Hold TTL elapsed before /pay or callback
    AWAITING_PAYMENT --> CANCELLED : Gateway NOK / Verify Failed [Payment=FAILED, Hold=RELEASED]
    AWAITING_PAYMENT --> CONFIRMED : Gateway OK + Active Own Hold + No Conflict [Payment=VERIFIED, Hold=CONVERTED]
    AWAITING_PAYMENT --> PAYMENT_REVIEW : Gateway OK BUT Hold Expired/Released OR Slot Taken [Payment=VERIFIED, AuditLog alert]

    CONFIRMED --> CANCELLED : Customer/Admin Cancel >= cutoff [Hold=RELEASED]
    CONFIRMED --> COMPLETED : Salon service completed
    CONFIRMED --> NO_SHOW : Customer did not attend
```

---

## 2. Payment Lifecycle Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /api/booking/pay [amountRial = amountToman * 10]
    PENDING --> FAILED : Gateway NOK OR verifyPayment() failed [Idempotent on repeat]
    PENDING --> VERIFIED : verifyPayment() succeeded [Idempotent on repeat]
```

---

## 3. Invariants Enforced in Code

1. A customer cannot pay for another customer's hold (`activeSlotHold.customerPhone !== appointment.customerPhone` -> HTTP `403`).
2. `POST /api/booking/pay` only accepts `HELD` or `AWAITING_PAYMENT` appointments with an unexpired `ACTIVE` `SlotHold`.
3. `handlePaymentCallback` never transitions an expired, released, or conflicting appointment to `CONFIRMED`; instead it records `Payment.status = VERIFIED`, moves `Appointment.status = PAYMENT_REVIEW`, and logs `PAYMENT_RECONCILIATION_ALERT`.
4. Duplicate callbacks (`VERIFIED` or `FAILED`) return idempotently (`isIdempotentRepeat: true`) without re-mutating state or sending duplicate SMS notifications.
