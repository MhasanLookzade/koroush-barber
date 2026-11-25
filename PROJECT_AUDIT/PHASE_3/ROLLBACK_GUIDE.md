# Phase 3 — Rollback Guide

**Current Branch:** `fix/phase-3-payment-booking-integrity`  
**Pre-Phase-3 Backup Branch:** `backup/pre-phase-3` (commit `43023c5`)  
**Earlier Preserved Backups:** `backup/pre-phase-1` (`ae409d4`), `backup/pre-phase-2` (`edfe2d8`)

---

## 1. Application Code Rollback

To revert all Phase 3 application changes cleanly to the verified Phase 2 baseline:

```bash
git checkout backup/pre-phase-3
```

Or to create a revert commit on `fix/phase-3-payment-booking-integrity`:

```bash
git checkout fix/phase-3-payment-booking-integrity
git revert --no-commit backup/pre-phase-3..HEAD
```

---

## 2. Database Migration Rollback (PostgreSQL)

If Phase 3 migrations were applied to a PostgreSQL database and must be rolled back:

1. Drop the Phase 3 partial unique indexes:
   ```sql
   DROP INDEX IF EXISTS "SlotHold_active_slot_unique";
   DROP INDEX IF EXISTS "Appointment_confirmed_slot_unique";
   ```
2. Remove migration records from `_prisma_migrations` if resetting migration state:
   ```sql
   DELETE FROM "_prisma_migrations"
   WHERE "migration_name" IN (
     '20261125000000_slot_concurrency_indexes',
     '20261125000001_schema_sync_audit_notif'
   );
   ```
3. Note: `20261125000001_schema_sync_audit_notif` only adds non-destructive columns and relaxes `NotificationJob.updatedAt` `NOT NULL`, so existing data remains intact even if the columns are kept.
