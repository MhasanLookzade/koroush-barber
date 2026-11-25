# Phase 3.1 — Payment Callback, Hold Lifecycle & Idempotency Review

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Target Function:** [`handlePaymentCallback()`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts#L533-L905) and [`app/api/booking/callback/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/booking/callback/route.ts)

---

## 1. Transaction Boundaries & External Call Separation

- `gateway.verifyPayment()` executes **before** opening `prisma.$transaction(...)`. Database locks are never held during payment gateway HTTP round-trips.
- Confirmation SMS (`sms.sendBookingConfirmation()`) and `NotificationJob.create()` execute **after** `prisma.$transaction(...)` commits (wrapped in `try/catch` so SMS outages never revert a verified booking).

---

## 2. Independent Scenario Verification Matrix (PostgreSQL 16.16)

| Scenario | Verified Behavior | Result |
|---|---|---|
| Payment callback after hold **expired** | `Payment` -> `VERIFIED`, `Appointment` -> `PAYMENT_REVIEW`, `AuditLog` alert written; NOT `CONFIRMED` | **PASS** |
| Payment callback after hold **released** | `Payment` -> `VERIFIED`, `Appointment` -> `PAYMENT_REVIEW`; NOT `CONFIRMED` | **PASS** |
| Payment initiation for **another customer's hold** | HTTP `403` rejected (`activeSlotHold.customerPhone !== appointment.customerPhone` / `customerPhone` / `customer_auth` mismatch) | **PASS** |
| Duplicate successful callback (`OK` -> `OK`) | 2nd call returns `{ success: true, isIdempotentRepeat: true }` with 0 extra mutations/SMS | **PASS** |
| `OK` callback after `FAILED` (`NOK` -> `OK`) | Returns `{ success: false, isIdempotentRepeat: true }`, preserves `CANCELLED` | **PASS** |
| `NOK` callback after `VERIFIED` (`OK` -> `NOK`) | Returns `{ success: true, isIdempotentRepeat: true }`, preserves `CONFIRMED` | **PASS** |
| Two **concurrent** `OK` callbacks on same `authority` | `1` fresh confirm, `1` idempotent repeat (via `tx` check or `P2034` catch), `1` `NotificationJob` | **PASS** |
| Payment verification timeout / thrown error (`REL-001` boundary) | `gateway.verifyPayment()` throws prior to confirmation `tx`; `Payment` stays `PENDING`, `Appointment` never confirms | **PASS** (Verified by inspection; explicit HTTP timeout deferred to Phase 4) |

---

## 3. Classified Findings

| ID | Finding | Status | Severity | Notes |
|---|---|---|---|---|
| CBK-31-01 | Expired/released hold confirmed by delayed callback | **Not Found** | — | Explicitly blocked and routed to `PAYMENT_REVIEW` with `PAYMENT_RECONCILIATION_ALERT` in `AuditLog`. |
| CBK-31-02 | External SMS inside DB transaction (`BUG-004` in booking engine) | **Not Found** | — | Moved cleanly after transaction commit. |
| CBK-31-03 | `PAYMENT_REVIEW` overwrite nuance on duplicate `Payment` authority | **Confirmed** | Low | When a single `Appointment` has two separate `Payment` records (`auth1` confirms `CONFIRMED`, later `auth2` also verifies `OK`), `tx.appointment.update` keeps `status: "CONFIRMED"`, marks `auth2` `VERIFIED`, writes `AuditLog` (`PAYMENT_RECONCILIATION_ALERT`), and updates `adminNotes`. Money is recorded in `Payment` and flagged in `AuditLog`, though keeping an alert flag or surfacing duplicate-verified payments in `/admin/payments` makes reconciliation easier. |
| CBK-31-04 | ZarinPal `fetch` timeout (`REL-001`) | **Confirmed (Deferred)** | Medium (Phase 4) | `lib/providers/payment.ts` lacks `AbortSignal.timeout()` until Phase 4 by design. |

---

## 4. Verdict

- **Status:** **PASS** — Payment verification, out-of-order callbacks, concurrent callbacks, and expired/released hold reconciliation are atomic, idempotent, and audit-logged.
