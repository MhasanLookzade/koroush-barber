# Phase 0 — Payment and Booking Logic Review

## 1. End-to-End Financial & State Invariants
For every appointment created through online booking:
1. `totalPrice === service.price` (snapshot at hold creation).
2. `depositAmount === computeServiceDeposit(service)` (fixed or percentage rounded integer Tomans).
3. `balanceDue === Math.max(0, totalPrice - depositAmount)`.
4. `payment.amountToman === depositAmount` and `payment.amountRial === depositAmount * 10`.
5. After verification: `appointment.depositPaid === payment.amountToman` and `appointment.balanceDue === Math.max(0, appointment.totalPrice - appointment.depositPaid)`.

## 2. `BUG-001` — Fixed vs Percentage Deposit Calculation
- **Original Behavior:** `reserveSlotHold()` (`lib/booking-engine.ts:316-321`) computes `depositAmount` using `depositType === "percentage"` & `depositPercent`, storing `balanceDue = totalPrice - depositAmount` on `Appointment`. `app/api/booking/pay/route.ts:80` ignores `depositType`/`depositPercent` and reads `appointment.service.depositPrice || 50000`.
- **Root Cause:** Duplicated logic + reading stale `service.depositPrice` at `/pay` time.
- **Proposed Behavior:**
  - Export `computeServiceDeposit(service: { price: number; depositPrice: number; depositType: string; depositPercent: number | null }): number` in `lib/booking-engine.ts`.
  - In `app/api/booking/pay/route.ts`: compute expected deposit as `Math.max(0, appointment.totalPrice - appointment.balanceDue)` (the exact deposit locked when the hold was created!), and guard that it is `> 0` (falling back to `computeServiceDeposit(appointment.service)` only if `balanceDue === totalPrice` wasn't set).
  - Also verify `appointment.status` is `"HELD"` or `"AWAITING_PAYMENT"` and verify the active `SlotHold` belongs to `appointment.customerPhone` (`BUG-005`).

## 3. `BUG-003` — Concurrent Booking & Slot Reservation Race Conditions
- **Original Behavior:** `reserveSlotHold()` runs inside `prisma.$transaction(async (tx) => ...)` using PostgreSQL's default `ReadCommitted` isolation and check-then-insert queries (`findFirst` -> `create`).
- **Root Cause:** Under PostgreSQL `ReadCommitted`, two concurrent requests can both pass `findFirst` before either commits.
- **Proposed Behavior (Defense in Depth):**
  1. **Database-level PostgreSQL Partial Unique Indexes** (via a new Prisma SQL migration for PostgreSQL):
     - `CREATE UNIQUE INDEX IF NOT EXISTS "SlotHold_active_slot_unique" ON "SlotHold" ("barberId", "slotTime") WHERE "status" = 'ACTIVE';`
     - `CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_confirmed_slot_unique" ON "Appointment" ("barberId", "date") WHERE "status" IN ('CONFIRMED', 'COMPLETED');`
     *(Note: SQLite 3.8+ also supports partial unique indexes!)*
  2. **Transaction Isolation & Conflict Handling:** Run `reserveSlotHold` with `{ isolationLevel: "Serializable" }` when on PostgreSQL (or catch Prisma `P2002` unique violation / `P2034` serialization failure and translate to clean 409 conflict `"این ساعت هم‌اکنون توسط کاربر دیگری در حال پرداخت است"`).
  3. **Same-User Re-Hold Cleanup:** If the *same* `customerPhone` already holds an `ACTIVE` hold for that slot and calls `reserveSlotHold` again, mark their prior hold `RELEASED` (or reuse) inside the transaction so a partial unique index on `(barberId, slotTime) WHERE status = 'ACTIVE'` never blocks the same user retrying!

## 4. `BUG-002` — Notification Delivery Status Accuracy on Admin Reschedule
- **Original Behavior:** `app/api/admin/appointments/reschedule/route.ts:154-166` inserts `NotificationJob` with `status: "SENT"` and `provider: "SMS_IR"` inside the transaction without calling `getSmsProvider()`.
- **Proposed Behavior:**
  - Keep the reschedule DB updates (`appointment.update`, `slotHold.updateMany`, `auditLog.create`) inside `prisma.$transaction`.
  - After the transaction commits, call `const sms = getSmsProvider(); const smsResult = await sms.sendCustomSms(updatedApp.customerPhone, smsMessage)`.
  - Persist `prisma.notificationJob.create(...)` with the **real** `status: smsResult.success ? "SENT" : "FAILED"`, `error: smsResult.error || null`, `provider: sms.name`, and `sentAt: smsResult.success ? new Date() : null`.
