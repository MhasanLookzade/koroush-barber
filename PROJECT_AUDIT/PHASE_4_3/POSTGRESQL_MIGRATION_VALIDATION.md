# Phase 4.3 â€” Independent PostgreSQL 16 Migration Validation

**Engine Verified:** `PostgreSQL 16.16 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit`

## 1. Clean PostgreSQL 16 Database (`barberbook_p43_clean`)

Executed `npx prisma migrate deploy` from zero tables across all 5 migrations:
1. `20261124000000_init`
2. `20261125000000_slot_concurrency_indexes`
3. `20261125000001_schema_sync_audit_notif`
4. `20261125000002_review_legacy_columns_nullable`
5. `20261125000003_notification_lease_and_dedup`

All 5 applied with zero errors. Inspected `NotificationJob` columns (`information_schema.columns`) and indexes (`pg_indexes`):
- Added nullable columns: `dedupKey` (`text`, `YES`), `lockedAt` (`timestamp without time zone`, `YES`), `leaseExpiresAt` (`timestamp without time zone`, `YES`).
- Verified active PostgreSQL indexes:
  - `NotificationJob_dedupKey_key`: `CREATE UNIQUE INDEX "NotificationJob_dedupKey_key" ON public."NotificationJob" USING btree ("dedupKey")`
  - `NotificationJob_status_leaseExpiresAt_idx`: `CREATE INDEX "NotificationJob_status_leaseExpiresAt_idx" ON public."NotificationJob" USING btree (status, "leaseExpiresAt")`
  - `NotificationJob_status_scheduledAt_idx`, `NotificationJob_phone_idx`, `NotificationJob_type_idx`, `NotificationJob_pkey`.

## 2. Existing PostgreSQL 16 Upgrade & Pre-Migration Record Handling (`barberbook_p43_upgrade`)

Applied the baseline 4 migrations, inserted two representative pre-existing rows prior to Phase 4.2 DDL:
- `pre-sent-1`: `status = 'SENT'`, `scheduledAt = NOW() - 10 minutes`
- `pre-sending-2`: `status = 'SENDING'`, `scheduledAt = NOW() - 10 minutes`

Then executed [`prisma/migrations/20261125000003_notification_lease_and_dedup/migration.sql`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000003_notification_lease_and_dedup/migration.sql):
1. **Non-destructive DDL:** Strictly `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE [UNIQUE] INDEX IF NOT EXISTS`. Zero `DROP`, `TRUNCATE`, or `DELETE` statements.
2. **Existing row & `SENT` preservation:** Querying `NotificationJob` immediately post-migration showed both rows completely intact with nullable new fields (`NULL`).
3. **Live Runtime Recovery on Upgraded DB:** Ran `recoverStuckSendingJobs(60000)` + `processDueNotificationJobs()` against `barberbook_p43_upgrade`:
   - `pre-sending-2` (stranded pre-migration `SENDING` row with `lockedAt=null, leaseExpiresAt=null`) recovered (`rec: 1`) and delivered cleanly (`status: "SENT"`, `lockedAt: null`, `leaseExpiresAt: null`).
   - `pre-sent-1` remained untouched (`status: "SENT"`, no duplicate resend).
4. **`dedupKey` Uniqueness Enforced:** Verified in Section 3 across `2`, `10`, and `20` simultaneous inserts on PostgreSQL 16.
