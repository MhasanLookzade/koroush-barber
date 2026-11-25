# Phase 3.1 — PostgreSQL Partial Unique Index & Concurrency Review

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Verified Engine:** `PostgreSQL 16.16 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit`

---

## 1. Inspected Live PostgreSQL Index Definitions (`pg_indexes`)

Observed directly via `SELECT indexname, indexdef FROM pg_indexes` on `barberbook_phase3_test`:

1. **`SlotHold_active_slot_unique`:**
   ```sql
   CREATE UNIQUE INDEX "SlotHold_active_slot_unique"
   ON public."SlotHold" USING btree ("barberId", "slotTime")
   WHERE (status = 'ACTIVE'::text)
   ```
   - **Scope:** `(barberId, slotTime)` restricted to active holds (`status = 'ACTIVE'`).
   - **Lifecycle Compatibility:** `EXPIRED`, `RELEASED`, and `CONVERTED` rows fall outside the partial predicate, allowing immediate legitimate re-booking once released or expired. Different barbers or time slots do not collide.

2. **`Appointment_confirmed_slot_unique`:**
   ```sql
   CREATE UNIQUE INDEX "Appointment_confirmed_slot_unique"
   ON public."Appointment" USING btree ("barberId", date)
   WHERE (status = ANY (ARRAY['CONFIRMED'::text, 'COMPLETED'::text]))
   ```
   - **Scope:** `(barberId, date)` restricted to finalized salon occupancy (`CONFIRMED`, `COMPLETED`).
   - **Lifecycle Compatibility:** `HELD`, `AWAITING_PAYMENT`, `CANCELLED`, `EXPIRED`, `NO_SHOW`, and `PAYMENT_REVIEW` rows remain unrestricted so failed/cancelled/expired holds never block future slot reuse.

---

## 2. Transaction Isolation, Retries & Error Handling (`lib/booking-engine.ts`)

- `isPostgresDatabase()` inspects `DATABASE_URL` (`postgres://` / `postgresql://`) and passes `{ isolationLevel: "Serializable" }` to `prisma.$transaction()` for both `reserveSlotHold()` and `handlePaymentCallback()`.
- **Conflict Handling:** `isPrismaConcurrencyError()` catches both `P2002` (PostgreSQL unique index violation `23505`) and `P2034` (PostgreSQL `Serializable` write conflict/deadlock `40001`).
- In `reserveSlotHold()`: expired `ACTIVE` holds on `(barberId, slotTime)` are transitioned to `EXPIRED`, and prior `ACTIVE` holds owned by the *same* `customerPhone` are marked `RELEASED` inside the transaction before creating the new hold.

---

## 3. PostgreSQL 16.16 Live Concurrency Evidence

- **2 concurrent `reserveSlotHold` calls:** `1` succeeded, `1` rejected (`P2034`/`409`).
- **10 concurrent `reserveSlotHold` calls:** `1` succeeded, `9` rejected.
- **25 simultaneous `reserveSlotHold` calls (`phase31_pg_independent.ts`):** `1` succeeded, `24` rejected (`0` duplicate holds).
- **Direct duplicate `ACTIVE` `SlotHold` insert:** Rejected by PostgreSQL `SlotHold_active_slot_unique` with `P2002`.
- **Direct duplicate `CONFIRMED` `Appointment` insert:** Rejected by PostgreSQL `Appointment_confirmed_slot_unique` with `P2002`.
- **Re-booking after `RELEASED` hold:** Succeeded immediately.

---

## 4. Classified Findings

| ID | Finding | Status | Severity | Notes |
|---|---|---|---|---|
| PG-31-01 | Concurrent double-booking under PostgreSQL `ReadCommitted` (`BUG-003`) | **Not Found** | — | Closed by PostgreSQL partial unique indexes + `Serializable` isolation + `P2002`/`P2034` handling. |
| PG-31-02 | Partial unique indexes blocking legitimate future/released bookings | **Not Found** | — | Verified in PostgreSQL 16.16 that `RELEASED`, `EXPIRED`, and `CANCELLED` rows do not block subsequent holds/bookings. |
| PG-31-03 | `P2002` on `Customer.phone` masked as slot-in-payment message | **Confirmed** | Low / UX | `isPrismaConcurrencyError()` catches all `P2002` codes; if the same new phone submits two concurrent requests on *different* slots, `Customer_phone_key` `P2002` maps to the slot-conflict message instead of retrying `Customer` lookup. |
| PG-31-04 | `POST /api/admin/appointments` manual insert lacks `Serializable` / `P2002` catch | **Confirmed** | Low | Admin manual booking checks collision with `findFirst` before `create`; the DB index `Appointment_confirmed_slot_unique` still prevents double-booking, though a simultaneous race would return HTTP `500` rather than `409`. |

---

## 5. Verdict

- **Status:** **PASS** — PostgreSQL 16 storage-engine constraints and `Serializable` transactions strictly guarantee single-winner slot reservation and confirmation exclusivity.
