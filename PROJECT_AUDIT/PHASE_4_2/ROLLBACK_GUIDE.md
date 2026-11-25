# Phase 4.2 â€” Rollback Guide

## 1. Git Code Rollback (Preserves Verified Phase 4.1 Baseline)

Phase 4.2 was implemented cleanly on branch `fix/phase-4.2-notification-hardening` from backup branch `backup/pre-phase-4.2` (`05c564a`).

To revert application source code strictly back to Phase 4 / 4.1 (`fix/phase-4-reliability-notifications` at `05c564a`):
```bash
git checkout fix/phase-4-reliability-notifications
# Or create a recovery branch from the backup commit:
git checkout -b rollback/phase-4.2 backup/pre-phase-4.2
npx prisma generate
npm run build
```

All earlier backup branches remain untouched:
- `backup/pre-phase-1` (`ae409d4`)
- `backup/pre-phase-2` (`edfe2d8`)
- `backup/pre-phase-3` (`43023c5`)
- `backup/pre-phase-3.2` (`9a52937`)
- `backup/pre-phase-4` (`0e95123`)
- `backup/pre-phase-4.2` (`05c564a`)

## 2. Non-Destructive Database Rollback (PostgreSQL)

Migration [`20261125000003_notification_lease_and_dedup`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000003_notification_lease_and_dedup/migration.sql) is purely additive (`dedupKey`, `lockedAt`, `leaseExpiresAt` nullable columns + 2 indexes). Legacy Phase 4 code ignores unknown columns if reverting code only.

If full schema reversal is explicitly required after reverting application code:
```sql
DROP INDEX IF EXISTS "NotificationJob_status_leaseExpiresAt_idx";
DROP INDEX IF EXISTS "NotificationJob_dedupKey_key";

ALTER TABLE "NotificationJob"
  DROP COLUMN IF EXISTS "leaseExpiresAt",
  DROP COLUMN IF EXISTS "lockedAt",
  DROP COLUMN IF EXISTS "dedupKey";
```
Remember to delete or mark rolled-back the corresponding record in `"_prisma_migrations"` if downgrading schema manually:
```sql
DELETE FROM "_prisma_migrations"
WHERE "migration_name" = '20261125000003_notification_lease_and_dedup';
```
