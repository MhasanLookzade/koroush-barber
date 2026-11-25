# PostgreSQL 16.16 Concurrency & Migration Verification Results

**Engine Tested:** `PostgreSQL 16.16 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit` (`postgres:16-alpine` on `127.0.0.1:5434`)

## 1. Clean Migration Deployment (`barberbook_phase42_test`)

Executed `npx prisma migrate deploy` across all 5 migrations:
1. `20261124000000_init`
2. `20261125000000_slot_concurrency_indexes`
3. `20261125000001_schema_sync_audit_notif`
4. `20261125000002_review_legacy_columns_nullable`
5. `20261125000003_notification_lease_and_dedup`

All 5 migrations applied with zero errors. Inspected `NotificationJob` metadata in PostgreSQL:
- Added nullable columns: `dedupKey` (`text`), `lockedAt` (`timestamp without time zone`), `leaseExpiresAt` (`timestamp without time zone`).
- Verified active indexes in `pg_indexes`:
  - `NotificationJob_dedupKey_key` (`CREATE UNIQUE INDEX "NotificationJob_dedupKey_key" ON public."NotificationJob" USING btree ("dedupKey")`)
  - `NotificationJob_status_leaseExpiresAt_idx` (`CREATE INDEX "NotificationJob_status_leaseExpiresAt_idx" ON public."NotificationJob" USING btree (status, "leaseExpiresAt")`)
  - `NotificationJob_status_scheduledAt_idx`, `NotificationJob_phone_idx`, `NotificationJob_type_idx`, `NotificationJob_pkey`.

## 2. Existing Database Upgrade Preservation (`barberbook_phase42_upgrade`)

Applied the baseline 4 migrations, inserted pre-existing rows (`('pre-existing-1', ..., 'SENT')` and `('pre-existing-2', ..., 'SENDING')`), and applied `20261125000003_notification_lease_and_dedup/migration.sql` via `psql -v ON_ERROR_STOP=1`:
- `ALTER TABLE` and both `CREATE INDEX` statements succeeded without locking failure or data loss.
- Both pre-existing rows remained intact with `dedupKey`, `lockedAt`, `leaseExpiresAt` populated cleanly as `NULL`.

## 3. PostgreSQL 16.16 Concurrency Suites Executed

| Suite | Command | Passed | Failed | Key Concurrency Proofs on PG 16.16 |
|---|---|---|---|---|
| Phase 3 + 3.2 PG Concurrency | `npx ts-node test/phase3_postgres_concurrency.test.ts` | **40** | **0** | 10 simultaneous slot holds -> strictly 1 succeeds, 9 rejected; 2 concurrent payment callbacks -> 1 confirm, 1 idempotent repeat, 1 SMS; partial unique indexes enforce P2002; Phase 3.2 review/admin booking/legacy cancel intact |
| Phase 4.2 Hardening Suite (PG) | `npx ts-node test/phase4_2_hardening.test.ts` | **20** | **0** | 3 concurrent worker claims -> 1 claimed & 1 SMS; active lease immune to premature recovery; **2-way AND 10-way simultaneous cron cycles -> strictly 1 `NotificationJob` & 1 SMS (`NotificationJob_dedupKey_key`)**; 6-way concurrent birthday cron -> 1 job & 1 SMS; expired lease recovery & `UNKNOWN` API workflow & redaction |
