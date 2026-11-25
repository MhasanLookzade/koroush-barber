# Phase 3 — Changed Files Inventory

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Baseline:** `backup/pre-phase-3` (commit `43023c5` on `fix/phase-2-api-security`)

---

## Modified Source Files

1. [`lib/booking-engine.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts)
   - Added exported [`computeServiceDeposit()`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts#L38-L62) with integer Toman arithmetic and strict validation of fixed vs percentage deposit configurations.
   - Updated [`reserveSlotHold()`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts) to use `computeServiceDeposit()`, `Serializable` transaction isolation when running on PostgreSQL (`isPostgresDatabase()`), in-transaction expired-hold cleanup, same-user re-hold cleanup, and Prisma `P2002`/`P2034` concurrency conflict translation.
   - Updated [`handlePaymentCallback()`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts) to enforce idempotency for `VERIFIED`/`FAILED`, validate active unexpired hold ownership inside the confirmation transaction (routing stale/expired/conflicting callbacks to `PAYMENT_REVIEW`), catch `P2002`/`P2034`, and dispatch confirmation SMS **outside** `prisma.$transaction()`.

2. [`app/api/booking/pay/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/booking/pay/route.ts)
   - Replaced `appointment.service.depositPrice || 50000` with server-authoritative deposit calculation (`Math.max(0, Math.round(appointment.totalPrice - appointment.balanceDue))` falling back to `computeServiceDeposit(appointment.service)`), rejecting `<= 0` amounts (`BUG-001`).
   - Added strict state checks (`HELD` / `AWAITING_PAYMENT`), slot-hold ownership verification (`activeSlotHold.customerPhone === appointment.customerPhone`), optional `customerPhone` / `customer_auth` ownership checks, and atomic `Payment` + `Appointment` update (`BUG-005`).

3. [`app/api/customer/appointments/[id]/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/customer/appointments/%5Bid%5D/route.ts)
   - Updated `PATCH` cancellation to enforce `cancellation_cutoff_hours` for `CONFIRMED` appointments, release any `ACTIVE` `SlotHold`, and wrap cancellation + audit log + notification in `prisma.$transaction()` (`BUG-007`).

---

## New Database Migrations

4. [`prisma/migrations/20261125000000_slot_concurrency_indexes/migration.sql`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000000_slot_concurrency_indexes/migration.sql)
   - Adds PostgreSQL partial unique indexes `SlotHold_active_slot_unique` and `Appointment_confirmed_slot_unique`.

5. [`prisma/migrations/20261125000001_schema_sync_audit_notif/migration.sql`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000001_schema_sync_audit_notif/migration.sql)
   - Non-destructive `ADD COLUMN IF NOT EXISTS` and `NotificationJob.updatedAt` default/nullable alignment so fresh `prisma migrate deploy` matches `prisma/schema.prisma`.

---

## New Test Suite

6. [`test/phase3_postgres_concurrency.test.ts`](file:///c:/Users/blue/Documents/projects/barber/test/phase3_postgres_concurrency.test.ts)
   - Dedicated 29-assertion Payment, Booking Hold Integrity, and real PostgreSQL 16 Concurrency test suite.
