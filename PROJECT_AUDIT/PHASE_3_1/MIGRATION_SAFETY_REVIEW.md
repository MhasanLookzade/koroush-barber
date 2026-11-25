# Phase 3.1 — Prisma Migration Safety & Schema Compatibility Review

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Inspected Migrations:**
- [`20261124000000_init`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261124000000_init/migration.sql)
- [`20261125000000_slot_concurrency_indexes`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000000_slot_concurrency_indexes/migration.sql)
- [`20261125000001_schema_sync_audit_notif`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000001_schema_sync_audit_notif/migration.sql)

---

## 1. Why `20261125000001_schema_sync_audit_notif` Was Necessary

When `prisma migrate deploy` was first executed against a clean PostgreSQL 16 database (`barberbook_phase3_test`), `handlePaymentCallback()` failed on `NotificationJob.create` (`P2022`: column `NotificationJob.recipientName` missing; `P2011`: `NotificationJob.updatedAt` `NOT NULL`) and `AuditLog.create` (`P2022`: column `AuditLog.userType` missing). `prisma migrate diff` confirmed that `20261124000000_init` predated several fields later added to `prisma/schema.prisma` (`AuditLog`, `Notification`, `NotificationJob`, `Review`, `SiteSetting`), likely previously applied in dev via `prisma db push`.

---

## 2. Detailed SQL Operation & Safety Inspection

### A. `20261125000000_slot_concurrency_indexes`
- Operations: Two `CREATE UNIQUE INDEX IF NOT EXISTS` partial indexes on `SlotHold` and `Appointment`.
- **Safety on existing DB:** Zero table rewrites, zero `DROP`s, zero column alterations, foreign-key safe. Pre-condition: existing `ACTIVE` duplicate `SlotHold` or duplicate `CONFIRMED`/`COMPLETED` `Appointment` rows on the same `(barberId, slotTime/date)` must not exist before index creation.

### B. `20261125000001_schema_sync_audit_notif`
- Operations: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for `AuditLog`, `Notification`, `NotificationJob`, `Review`, and `SiteSetting`; `ALTER COLUMN "scheduledAt" SET DEFAULT CURRENT_TIMESTAMP`; conditional `DO $$ ... $$` dropping `NOT NULL` and adding default on `NotificationJob.updatedAt` if present.
- **Safety on existing DB:** Zero `DROP` statements, preserves all pre-existing column values and rows.
- **Verified Live Data Preservation (`barberbook_phase3_existing`):**
  1. Applied `20261124000000_init`.
  2. Seeded 1 record in each of `Barber`, `Service`, `Customer`, `SlotHold`, `Appointment`, `Payment`, `AuditLog`, `Notification`, `SiteSetting`, and `Review`.
  3. Executed `20261125000000` and `20261125000001` sequentially without error.
  4. Verified all 8 queried tables retained exact row count = `1`.

---

## 3. Classified Findings

| ID | Finding | Status | Severity | Technical Evidence |
|---|---|---|---|---|
| MIG-31-01 | **Latent `Review.customerName` / `Review.customerPhone` `NOT NULL` constraint on fresh `prisma migrate deploy` DBs** | **Confirmed** | **Medium** | `20261124000000_init` creates `"Review"` with `"customerName" TEXT NOT NULL` and `"customerPhone" TEXT NOT NULL`, whereas `prisma/schema.prisma` expects `"name" TEXT`. `20261125000001` added `"name" TEXT NOT NULL DEFAULT ''` safely, **without dropping `NOT NULL` on `"customerName"` / `"customerPhone"`**. Verified live on `barberbook_phase3_test`: `prisma.review.create({ data: { name: "کاربر تست", rating: 5, comment: "عالی" } })` threw `Null constraint violation on the fields: (customerName)`. Does NOT break existing `db push` DBs where those columns don't exist, nor booking/payment flows, **but breaks public `/api/reviews` submissions on freshly migrated PostgreSQL DBs** until fixed with an additive migration (`ALTER COLUMN "customerName" DROP NOT NULL`, `ALTER COLUMN "customerPhone" DROP NOT NULL`). |
| MIG-31-02 | Destructive `DROP` or data loss in Phase 3 migrations | **Not Found** | — | Zero `DROP` operations; all 10 seeded tables preserved 100% of records in `barberbook_phase3_existing`. |
| MIG-31-03 | Unsynced `Notification` columns (`createdAt` / `link`) | **Confirmed** | Low | `20261124000000_init` has nullable `"link"` and defaulted `"createdAt"`, neither of which blocks `prisma.notification.create` (verified working because defaulted/nullable). |

---

## 4. Verdict on Migrations

- **Status:** **PASS WITH CONDITION (`MIG-31-01`)**
- Both Phase 3 migrations are **non-destructive and safe for existing databases** (100% data preservation confirmed), and clean builds succeed. Before deploying `prisma migrate deploy` on a **fresh** PostgreSQL instance where customer reviews (`/api/reviews`) will be used, add an additive migration dropping `NOT NULL` on `"Review"."customerName"` and `"Review"."customerPhone"`.
