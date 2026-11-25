# Phase 4 — Payment & SMS Transaction Boundary Review

**Branch:** `fix/phase-4-reliability-notifications`

---

## 1. Audited External HTTP Call Sites

| Route / Module | External Service | DB Transaction Boundary | Phase 4 Verification |
|---|---|---|---|
| `lib/booking-engine.ts` (`handlePaymentCallback`) | ZarinPal `verifyPayment()` | Called **before** opening `prisma.$transaction` | Uncertain failures keep `Payment=PENDING`; DB tx never held open during HTTP |
| `lib/booking-engine.ts` (`handlePaymentCallback`) | Kavenegar `sendBookingConfirmation()` | Enqueued `"QUEUED"` inside `tx`; SMS dispatched **after** commit via `processNotificationJob()` | Zero external HTTP inside `prisma.$transaction` (`BUG-004` fully closed) |
| `app/api/admin/appointments/reschedule/route.ts` | Kavenegar `sendCustomSms()` | Enqueued `"QUEUED"` inside `tx`; SMS dispatched **after** commit via `processNotificationJob()` | Fake `"SENT"` / `"SMS_IR"` eliminated (`BUG-002` fixed); failed SMS leaves reschedule committed |
| `app/api/booking/pay/route.ts` | ZarinPal `initiatePayment()` | Runs **before** `[payment.create, appointment.update]` transaction | Zero DB lock held during gateway initiation HTTP call |
| `app/api/booking/otp/send/route.ts` | Kavenegar `sendOtp()` | Runs **after** `otpChallenge.create`, no open tx | Checks real SMS result and returns `503` on provider failure |
| `app/api/admin/sms/route.ts` & `app/api/admin/birthdays/route.ts` | Kavenegar SMS | Uses `enqueueNotificationJob` + post-commit `processNotificationJob()` | Zero transactions held open on SMS calls |

---

## 2. Out-of-Scope Original Audit Items Confirmed Unchanged

Per Phase 4 rules (*only findings confirmed to belong to external service reliability, notification delivery, and fault tolerance*):
- **`BUG-006`** (`app/(customer)/layout.tsx` unauthenticated frontend spinner): frontend layout issue — left untouched for UI track.
- **`BUG-009`** (`lib/booking-engine.ts` `WorkingHour` availability logic): scheduling rule issue — left untouched.
- **`BUG-010`** (`scripts/seed-production.js` missing public static image paths / metadata): static asset/seed issue — left untouched.
