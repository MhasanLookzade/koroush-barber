# Phase 3.2 — Rollback Guide

**Current Branch:** `fix/phase-3.2-final-integrity`  
**Pre-Phase-3.2 Baseline:** `backup/pre-phase-3.2` (commit `9a52937`)  
**Earlier Preserved Backups:** `backup/pre-phase-1` (`ae409d4`), `backup/pre-phase-2` (`edfe2d8`), `backup/pre-phase-3` (`43023c5`)

---

## 1. Application Code Rollback

```bash
git checkout backup/pre-phase-3.2
```

Or revert strictly the Phase 3.2 commit/diff:

```bash
git checkout fix/phase-3.2-final-integrity
git checkout backup/pre-phase-3.2 -- app/api/admin/appointments/route.ts app/api/appointments/[id]/route.ts test/phase3_postgres_concurrency.test.ts
```

---

## 2. Database Migration Rollback (`20261125000002_review_legacy_columns_nullable`)

- This migration is purely additive/non-destructive (`DROP NOT NULL` + backfill of empty `"name"`). Rolling back application code does **not** require altering `"Review"`.
- If explicit constraint restoration is ever needed on a legacy schema:
  ```sql
  DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261125000002_review_legacy_columns_nullable';
  ```
  *(Re-applying `SET NOT NULL` is only valid if zero rows have `NULL` in `customerName`/`customerPhone`.)*
