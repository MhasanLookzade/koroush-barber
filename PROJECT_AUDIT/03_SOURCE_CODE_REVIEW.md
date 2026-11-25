# 03 — Complete Source Code Review

This review covers first-party application logic across `lib/`, `app/api/`, `app/(admin)/`, `app/(booking)/`, `app/(customer)/`, `components/`, and `scripts/`. Full structured metadata for all 24 findings is stored in [issues.json](./issues.json).

## 1. Confirmed Bugs & Logic Defects

### `BUG-001` — Deposit Calculation Mismatch in Payment Initiation
- **Severity:** HIGH | **Confidence:** High | **Status:** Confirmed through source code
- **Location:** `app/api/booking/pay/route.ts:79-80` (`POST`) vs `lib/booking-engine.ts:316-320` (`reserveSlotHold`)
- **Explanation:** `reserveSlotHold()` computes `depositAmount = Math.round((totalPrice * service.depositPercent) / 100)` when `depositType === "percentage"`. However, `pay/route.ts` hardcodes `const depositAmount = appointment.service.depositPrice || 50000`, completely ignoring `depositType` and `depositPercent`.
- **Consequences:** Customers can be quoted one deposit on the Step 5 invoice and charged a different amount at the payment gateway.
- **Recommended Correction:** Extract `computeServiceDeposit(service)` in `lib/booking-engine.ts` and invoke it in both functions.
- **Proposed Regression Test:** Create a service with `price: 1000000, depositType: "percentage", depositPercent: 30, depositPrice: 0` and assert `/api/booking/pay` initiates `amountToman === 300000`.
- **Complexity:** Low.

### `BUG-002` — Fake `SENT` SMS Logged on Admin Reschedule
- **Severity:** HIGH | **Confidence:** High | **Status:** Confirmed through source code
- **Location:** `app/api/admin/appointments/reschedule/route.ts:154-166` (`POST`)
- **Explanation:** Inserts `prisma.notificationJob` with `status: "SENT"` and `provider: "SMS_IR"` directly inside the transaction without ever calling `getSmsProvider()`.
- **Consequences:** Rescheduled customers never receive SMS alerts, while `/admin/sms` logs falsely show `SENT`.
- **Recommended Correction:** After the transaction commits, call `getSmsProvider().sendCustomSms(...)` and persist the actual `SENT`/`FAILED` status and `provider` name.
- **Proposed Regression Test:** Call `POST /api/admin/appointments/reschedule` and assert `MockSmsProvider.sentMessages` contains the reschedule message.
- **Complexity:** Low.

### `BUG-003` — Booking Hold Race Condition Under PostgreSQL `ReadCommitted`
- **Severity:** HIGH | **Confidence:** Medium | **Status:** Suspected through static analysis
- **Location:** `lib/booking-engine.ts:324-434` (`reserveSlotHold`)
- **Explanation:** `prisma.$transaction(async (tx) => ...)` runs at PostgreSQL's default `ReadCommitted` isolation level and performs `findFirst` checks before `slotHold.create` and `appointment.create`. Neither `SlotHold` nor `Appointment` has a DB-level partial unique index for active holds or confirmed slots.
- **Consequences:** Two concurrent requests in production PostgreSQL can both read zero active holds and insert two overlapping `ACTIVE` holds.
- **Recommended Correction:** Use `{ isolationLevel: "Serializable" }` with `P2034` retry or add PostgreSQL partial unique indexes (`WHERE status = 'ACTIVE'` / `WHERE status IN ('CONFIRMED','COMPLETED')`).
- **Complexity:** Medium.

### `BUG-004` — External SMS HTTP Call Inside Database Transaction
- **Severity:** HIGH | **Confidence:** High | **Status:** Confirmed through source code
- **Location:** `lib/booking-engine.ts:544-684` (`handlePaymentCallback`)
- **Explanation:** `await sms.sendBookingConfirmation(...)` executes inside `prisma.$transaction(async (tx) => ...)`.
- **Consequences:** If Kavenegar takes >5 seconds (Prisma's default interactive transaction timeout), the transaction aborts and rolls back a verified payment confirmation.
- **Recommended Correction:** Return `updatedApp` from `$transaction` first, then send SMS outside the transaction and create/update `NotificationJob`.
- **Complexity:** Low.

### `BUG-005` — Missing Hold Ownership & Status Guards in Payment Initiation
- **Severity:** MEDIUM | **Confidence:** High | **Status:** Confirmed through source code
- **Location:** `app/api/booking/pay/route.ts:39-77` (`POST`)
- **Explanation:** Only rejects `appointment.status === "CONFIRMED"`, allowing `CANCELLED` or `EXPIRED` appointments to proceed if any `ACTIVE` `SlotHold` exists for that slot (without matching `customerPhone`).
- **Recommended Correction:** Require `["HELD", "AWAITING_PAYMENT"].includes(appointment.status)` and filter `SlotHold` by `customerPhone: appointment.customerPhone`.
- **Complexity:** Low.

### `BUG-006` — Infinite Spinner for Unauthenticated Users in Customer Layout
- **Severity:** MEDIUM | **Confidence:** High | **Status:** Confirmed through source code
- **Location:** `app/(customer)/layout.tsx:44-83` (`CustomerLayout`)
- **Explanation:** When `/api/auth/customer/me` returns 401, `isLoggedIn` remains `false` and no redirect to `/auth` occurs.
- **Recommended Correction:** Call `router.replace("/auth")` when unauthenticated.
- **Complexity:** Low.

### `BUG-007` — Customer Portal Cancellation Bypasses 12-Hour Cutoff & Hold Release
- **Severity:** MEDIUM | **Confidence:** High | **Status:** Confirmed through source code
- **Location:** `app/api/customer/appointments/[id]/route.ts:69-77` (`PATCH`)
- **Explanation:** Updates `status: "CANCELLED"` without checking `cancellation_cutoff_hours` or releasing `SlotHold`.
- **Recommended Correction:** Share one `cancelAppointment()` service with `/api/booking/cancel`.
- **Complexity:** Low.

### `BUG-008` — Automated Reminders & Birthday SMS Lack Background Runner
- **Severity:** MEDIUM | **Confidence:** High | **Status:** Confirmed through source code
- **Location:** `app/api/admin/sms/route.ts:100-123` (`ReminderRulesConfig`)
- **Explanation:** Configuration is saved to `SiteSetting`, but no scheduled cron/worker processes due `REMINDER` or `BIRTHDAY` messages.
- **Complexity:** Medium.

### `BUG-009` — `WorkingHour` Model Ignored by Slot Generator
- **Severity:** MEDIUM | **Confidence:** High | **Status:** Confirmed through source code
- **Location:** `lib/booking-engine.ts:7-9, 55-73, 148` (`generateBaseDailySlots`, `getAvailabilityForDate`)
- **Explanation:** Uses hardcoded `10` to `23` constants instead of querying `prisma.workingHour`.
- **Complexity:** Low.

### `BUG-010` — Missing Public Assets & Metadata Inconsistencies
- **Severity:** LOW | **Confidence:** High | **Status:** Confirmed through source code
- **Location:** `scripts/seed-production.js:86,97`, `app/layout.tsx:41`, `lib/ics.ts:25-26`
- **Explanation:** `/og-image.jpg`, `/images/service-full.jpg`, `/images/service-haircut.jpg` do not exist in `public/`; domain alternates between `koroushbarber.ir` and `kouroshbarber.ir`; address in `lib/ics.ts` (`پلاک ۲۴`) differs from `app/page.tsx` (`مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴`).
- **Complexity:** Low.
