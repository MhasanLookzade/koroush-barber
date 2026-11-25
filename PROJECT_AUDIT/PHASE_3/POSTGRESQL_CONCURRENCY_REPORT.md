# Phase 3 — PostgreSQL Concurrency & Double-Booking Protection Report

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Database Engine Tested:** `PostgreSQL 16.16 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit` (isolated container `barberbook_phase3_pg` on `127.0.0.1:5433/barberbook_phase3_test`)

---

## 1. Root Cause of `BUG-003`

- Under PostgreSQL's default `ReadCommitted` transaction isolation, two concurrent transactions executing `findFirst(...)` -> `create(...)` can both observe zero existing holds/appointments before either commits, allowing duplicate active holds or double-confirmed bookings.
- SQLite dev tests cannot reproduce PostgreSQL `ReadCommitted` concurrent write anomalies.

---

## 2. Multi-Layer Concurrency Controls Implemented

1. **PostgreSQL Partial Unique Indexes ([`20261125000000_slot_concurrency_indexes/migration.sql`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000000_slot_concurrency_indexes/migration.sql))**
   - `SlotHold_active_slot_unique`: `UNIQUE ("barberId", "slotTime") WHERE "status" = 'ACTIVE'`
   - `Appointment_confirmed_slot_unique`: `UNIQUE ("barberId", "date") WHERE "status" IN ('CONFIRMED', 'COMPLETED')`
   - Enforces slot exclusivity at the storage-engine level regardless of application concurrency or horizontal scaling.

2. **Serializable Transaction Isolation (`lib/booking-engine.ts`)**
   - `reserveSlotHold()` and `handlePaymentCallback()` pass `{ isolationLevel: "Serializable" }` to `prisma.$transaction(...)` whenever `DATABASE_URL` targets PostgreSQL (`isPostgresDatabase()`).

3. **Explicit Conflict Handling (`P2002` & `P2034`)**
   - `reserveSlotHold()` catches Prisma `P2002` (unique constraint violation) and `P2034` (PostgreSQL serialization write conflict) and translates both to the user-facing 409 conflict message: `"این ساعت هم‌اکنون توسط کاربر دیگری در حال پرداخت است"`.
   - `handlePaymentCallback()` catches `P2002` / `P2034` during confirmation, returns idempotently if the same payment already transitioned to `VERIFIED`, or cleanly routes a losing concurrent appointment to `PAYMENT_REVIEW`.

4. **Same-User Re-Hold & Stale Hold Cleanup**
   - Inside `reserveSlotHold()`, expired `ACTIVE` holds for `(barberId, slotTime)` are marked `EXPIRED`, and a prior `ACTIVE` hold belonging to the same `customerPhone` is marked `RELEASED` before inserting the new `ACTIVE` `SlotHold` so `SlotHold_active_slot_unique` never blocks same-user retries.

---

## 3. Observed PostgreSQL 16 Concurrency Results (`test/phase3_postgres_concurrency.test.ts`)

| Concurrency Scenario | Expected Outcome | Observed Result on PostgreSQL 16.16 |
|---|---|---|
| 2 simultaneous `reserveSlotHold` calls on same slot | 1 succeeds, 1 rejected | **PASS** (1 fulfilled, 1 rejected with conflict) |
| 10 simultaneous `reserveSlotHold` calls on same slot | 1 succeeds, 9 rejected | **PASS** (1 fulfilled, 9 rejected) |
| 2 concurrent `handlePaymentCallback` calls on same `authority` | 1 fresh confirm, 1 idempotent repeat, 1 SMS job | **PASS** (`fresh=1`, `idem=1`, `notif=1`) |
| Direct duplicate `ACTIVE` `SlotHold` insert | PostgreSQL rejects with `P2002` | **PASS** (`Unique constraint failed on (barberId, slotTime)`) |
| Direct duplicate `CONFIRMED` `Appointment` insert | PostgreSQL rejects with `P2002` | **PASS** (`Unique constraint failed on (barberId, date)`) |
| Concurrent confirm & cancel race | Consistent final state, no double booking | **PASS** |
