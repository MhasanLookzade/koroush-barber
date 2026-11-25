# Phase 3.1 — Regression & Independent Test Validation

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Verification Scope:** All suites executed after final Phase 3 code/migration edits (zero source edits during Phase 3.1)

---

## 1. Initial Run Anomalies vs Final Re-runs (Chronological Honesty Record)

1. **Initial Phase 3 Migration Test Run (`task-5753`):** Failed on `NotificationJob.recipientName` & `AuditLog.userType` (`P2022`), exposing schema drift in `20261124000000_init`. Fixed in Phase 3 via `20261125000001_schema_sync_audit_notif`.
2. **Second Phase 3 Run (`task-5761`):** `28 PASSED, 1 FAILED` (`NotificationJob.updatedAt` `NOT NULL` constraint `P2011`). Fixed in `20261125000001_schema_sync_audit_notif` (`DO $$ ... DROP NOT NULL` & `DEFAULT CURRENT_TIMESTAMP`), after which clean `prisma migrate deploy` + `phase3_postgres_concurrency.test.ts` passed **29/29** (`task-5767` & `task-5855`).
3. **Concurrent `test:db` / `admin_login_browser.js` Runs (`task-5779`, `task-5790`):** Running `phase2_api_security.test.ts` immediately prior to `test:db` left 2 test appointments before `test:db`'s Test 4 cleanup (`19 PASSED, 3 FAILED`), and running `admin_login_browser.js` concurrently with `e2e_responsive.js` hit dev-server contention/timeout. When run in clean isolation/sequence in Phase 3.1 (`task-5838`, `task-5843`), all suites passed 100%.
4. **Independent Scratch Script Compilation (`task-5855`, `task-5865`, `task-5870`, `task-5875`):** Failed `ts-node` module resolution from external artifact scratch directory until `moduleResolution: node` was set via `TS_NODE_COMPILER_OPTIONS`, after which `phase31_pg_independent.ts` ran cleanly (**8 PASSED, 0 FAILED**) and surfaced `MIG-31-01` (`Review.create` on freshly migrated DB).

---

## 2. Final Phase 3.1 Verification Matrix (All Executed Freshly)

| Suite / Command | Database / Target | Final Result |
|---|---|---|
| Clean `npx prisma migrate deploy` (3 migrations) | PostgreSQL 16.16 (`barberbook_phase3_test`) | **PASS** |
| Existing-DB Upgrade Preservation Test (`barberbook_phase3_existing`) | PostgreSQL 16.16 (seeded before applying Phase 3 migrations) | **PASS** (`100%` rows preserved across 10 tables) |
| `npx ts-node test/phase3_postgres_concurrency.test.ts` | PostgreSQL 16.16 (`barberbook_phase3_test`) | **PASS** (`29 PASSED, 0 FAILED`) |
| `phase31_pg_independent.ts` (25-way concurrency, out-of-order callbacks, cutoff `<12h`/`>12h`) | PostgreSQL 16.16 (`barberbook_phase3_test`) | **PASS** (`8 PASSED, 0 FAILED`, plus confirmed latent `Review.create` `customerName` finding `MIG-31-01`) |
| `npx ts-node test/phase1_auth_security.test.ts` | Local SQLite (`dev.db`) | **PASS** (`13 PASSED, 0 FAILED`) |
| `npx ts-node test/phase2_api_security.test.ts` | Local SQLite (`dev.db`) | **PASS** (`9 PASSED, 0 FAILED`) |
| `npm run test:db` | Local SQLite (`dev.db`) | **PASS** (`22 PASSED, 0 FAILED`) |
| `npm run test:acceptance` | Local SQLite (`dev.db`) | **PASS** (`32 PASSED, 0 FAILED`) |
| `npx tsc --noEmit` | Full TypeScript project | **PASS** (`0` errors) |
| `npm run build` | Next.js 14.2.15 production build | **PASS** (`50/50` routes) |
| `node test/auth_test.js` | Live dev server (`http://localhost:3000`) | **PASS** (`6/6` checks) |
| `node test/admin_login_browser.js` | Live dev server + Chromium | **PASS** (`0px` overflow) |
| `node test/e2e_responsive.js` | Live dev server + Chromium (`11` viewports) | **PASS** (`11/11` PASS, `0` console errors) |
| `node test/admin_responsive.js` | Live dev server + Chromium (`8` routes × `5` viewports) | **PASS** (`40/40` PASS, `0px` overflow) |
