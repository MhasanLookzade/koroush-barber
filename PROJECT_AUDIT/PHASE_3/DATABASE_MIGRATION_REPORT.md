# Phase 3 — Database Migration & Schema Alignment Report

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Migrations Directory:** `prisma/migrations/`

---

## 1. Migrations Added in Phase 3

### Migration A: `20261125000000_slot_concurrency_indexes`
- **File:** [`prisma/migrations/20261125000000_slot_concurrency_indexes/migration.sql`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000000_slot_concurrency_indexes/migration.sql)
- **DDL:**
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS "SlotHold_active_slot_unique"
  ON "SlotHold" ("barberId", "slotTime")
  WHERE "status" = 'ACTIVE';

  CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_confirmed_slot_unique"
  ON "Appointment" ("barberId", "date")
  WHERE "status" IN ('CONFIRMED', 'COMPLETED');
  ```
- **Pre-Deployment Note:** Before deploying to an existing PostgreSQL database that may contain historical duplicate `ACTIVE` holds or duplicate `CONFIRMED` appointments on the same `(barberId, date)`, clean/expire duplicate `ACTIVE` holds first so index creation succeeds.

### Migration B: `20261125000001_schema_sync_audit_notif`
- **File:** [`prisma/migrations/20261125000001_schema_sync_audit_notif/migration.sql`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000001_schema_sync_audit_notif/migration.sql)
- **Discovery Context:** Running `npx prisma migrate deploy` against a fresh PostgreSQL 16 database revealed that `20261124000000_init` was missing columns later added to `prisma/schema.prisma` (`AuditLog.userType`, `AuditLog.oldData`, `AuditLog.newData`, `AuditLog.userAgent`, `NotificationJob.recipientName`, `NotificationJob.error`, `NotificationJob.provider`, `Notification.data`, `Notification.readAt`, `Notification.sentAt`, `Review.name`, `SiteSetting.createdAt`, `SiteSetting.description`) and had `NotificationJob.updatedAt NOT NULL` without a default.
- **DDL:** Uses non-destructive `ADD COLUMN IF NOT EXISTS` statements and conditionally drops `NOT NULL` / sets `DEFAULT CURRENT_TIMESTAMP` on `NotificationJob.updatedAt` if present.

---

## 2. Clean PostgreSQL Verification

- Executed `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` on isolated `barberbook_phase3_test` (`PostgreSQL 16.16`), followed by `npx prisma migrate deploy`:
  - Applied `20261124000000_init`
  - Applied `20261125000000_slot_concurrency_indexes`
  - Applied `20261125000001_schema_sync_audit_notif`
  - All 3 migrations applied cleanly with zero errors; `\di` confirmed `SlotHold_active_slot_unique` and `Appointment_confirmed_slot_unique` exist on PostgreSQL.

---

## 3. Rollback Implications

- **Index Rollback (`20261125000000`):**
  ```sql
  DROP INDEX IF EXISTS "SlotHold_active_slot_unique";
  DROP INDEX IF EXISTS "Appointment_confirmed_slot_unique";
  ```
  Dropping these indexes removes DB-level duplicate slot enforcement; no table data is lost.
- **Schema Sync Rollback (`20261125000001`):**
  Because all additions are non-destructive nullable/defaulted columns, reverting application code does not require dropping columns; if a full rollback is desired, `ALTER TABLE ... DROP COLUMN IF EXISTS ...` can be executed safely if no data depends on those columns.
