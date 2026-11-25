# Phase 3.2 — `MIG-31-01` Migration Fix Report (`Review` Legacy Constraints)

**Branch:** `fix/phase-3.2-final-integrity`  
**Migration Added:** [`prisma/migrations/20261125000002_review_legacy_columns_nullable/migration.sql`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000002_review_legacy_columns_nullable/migration.sql)

---

## 1. Root Cause Analysis

- [`20261124000000_init/migration.sql`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261124000000_init/migration.sql) created `"Review"` with `"customerName" TEXT NOT NULL` and `"customerPhone" TEXT NOT NULL`.
- Current [`prisma/schema.prisma`](file:///c:/Users/blue/Documents/projects/barber/prisma/schema.prisma#L277-L291) models `"Review"` with `"name" TEXT` (and no `customerName`/`customerPhone` fields), and [`app/api/reviews/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/reviews/route.ts#L110-L119) inserts `{ name, rating, comment, trackingCode, isVerified, status }`.
- [`20261125000001_schema_sync_audit_notif`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000001_schema_sync_audit_notif/migration.sql) added `"name" TEXT NOT NULL DEFAULT ''`, but left legacy `"customerName"` and `"customerPhone"` as `NOT NULL`, causing `POST /api/reviews` on cleanly migrated PostgreSQL DBs to fail with `Null constraint violation on the fields: (customerName)`.

---

## 2. Solution Applied (`20261125000002_review_legacy_columns_nullable`)

1. Checks `information_schema.columns` inside a safe `DO $$ ... $$` block for `"Review"."customerName"` and `"Review"."customerPhone"`.
2. If `"customerName"` exists:
   - Executes `ALTER TABLE "Review" ALTER COLUMN "customerName" DROP NOT NULL;`
   - Backfills `"name"` from `"customerName"` wherever `"name"` defaulted to `''` or `NULL`.
3. If `"customerPhone"` exists:
   - Executes `ALTER TABLE "Review" ALTER COLUMN "customerPhone" DROP NOT NULL;`
4. **Drops zero columns and deletes zero rows.**

---

## 3. Verification

- **Clean Fresh PostgreSQL (`barberbook_phase3_test`):** Applied all 4 migrations via `prisma migrate deploy`; `POST /api/reviews` succeeded (`200`).
- **Existing Pre-Seeded PostgreSQL (`barberbook_phase3_existing`):** Legacy row `r1` (`customerName = 'Old Reviewer'`) had `"name"` backfilled cleanly to `'Old Reviewer'` and remained intact; subsequent insert `r2` (`name = 'New Reviewer'`, `customerName = NULL`) succeeded cleanly.
