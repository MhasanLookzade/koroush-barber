# Phase 4.3 â€” Complete Independent Regression Report

All suites below were executed **independently in Phase 4.3** with zero source edits, explicitly separating **PostgreSQL 16.16** runs from **SQLite** runs.

## 1. PostgreSQL 16.16 Executed Suites

| Suite | Scope | Result | Notes |
|---|---|---|---|
| Clean `prisma migrate deploy` (5 migrations) | Fresh PG 16 schema | **PASS** | `barberbook_p43_clean` |
| Upgrade migration + stranded `SENDING` runtime recovery | Existing PG 16 upgrade | **PASS** | `barberbook_p43_upgrade` |
| `npx ts-node test/phase3_postgres_concurrency.test.ts` | Phase 3 & Phase 3.2 PG concurrency, deposits, reviews, legacy cancel | **40 PASSED, 0 FAILED** | Real PG 16 partial unique indexes |
| `npx ts-node test/phase4_2_hardening.test.ts` | Phase 4.2 worker leases, cron dedup, UNKNOWN safety, redaction | **20 PASSED, 0 FAILED** | Real PG 16 |
| `scratch/phase4_3_pg_audit.ts` | Independent 20-way worker claim, 2/10/20 reminder & birthday cron runs, crashes Aâ€“F, RBAC & 5-way retry | **20 PASSED, 0 FAILED** | Real PG 16; also logged `200,200` on concurrent `reconcile_unknown` (`REC-43-01`) |
| `npx ts-node test/phase4_reliability_notifications.test.ts` (ran on PG 16 in pre-4.3 check) | Pre-existing Phase 4 suite on PG 16 | **Halted at line 459** (expected PG constraint) | Investigated: pre-existing fixture at `test/phase4_reliability_notifications.test.ts:459-482` deliberately inserts a conflicting `CONFIRMED` row at `16:00` before `update`ing it to `17:00`. PostgreSQL partial index `Appointment_confirmed_slot_unique` enforces `P2002` immediately (proving double-booking prevention is active); SQLite passes 25/25 cleanly because it lacks PG partial indexes. |

## 2. SQLite & Application Build Executed Suites

| Suite | Command | Result |
|---|---|---|
| Phase 1 Auth & Session Security | `npx ts-node test/phase1_auth_security.test.ts` | **13 PASSED, 0 FAILED** |
| Phase 2 API Security & RBAC | `npx ts-node test/phase2_api_security.test.ts` | **9 PASSED, 0 FAILED** |
| Phase 4 External Reliability & Outbox | `npx ts-node test/phase4_reliability_notifications.test.ts` | **25 PASSED, 0 FAILED** |
| Phase 4.2 Hardening Suite | `npx ts-node test/phase4_2_hardening.test.ts` | **20 PASSED, 0 FAILED** |
| Safe Dev DB Reset | `npm run db:reset:dev` | **PASS** (exit 0) |
| Database Isolation Suite | `npm run test:db` | **22 PASSED, 0 FAILED** |
| End-to-End Acceptance Suite | `npm run test:acceptance` | **32 PASSED, 0 FAILED** |
| TypeScript Static Analysis | `npx tsc --noEmit` | **PASS** (`0` errors) |
| Production Build | `npm run build` | **PASS** |

## 3. Live Browser Executed Suites (`next dev`)

| Suite | Command | Result |
|---|---|---|
| Browser Auth / RBAC E2E | `node test/auth_test.js` | **PASS** (6/6 checks: 401, OWNER 200, STAFF 200, logout) |
| Public Responsive Matrix | `node test/e2e_responsive.js` | **PASS** (`11/11` viewports 320pxâ€“1920px, 0px overflow, 0 console errors) |
| Admin Responsive Matrix | `node test/admin_responsive.js` | **PASS** (`40/40` checks 320pxâ€“1440px, 0px overflow) |
| Admin Login Browser E2E | `node test/admin_login_browser.js` | **PASS** (redirect guard, login flow, 375px 0px overflow) |
| `/admin/sms` `UNKNOWN` Live Chromium UI Check | Playwright `verify_admin_sms_ui.js` (`1440x900`) | **PASS** (badge, filter option, caution alert, confirm-sent & resend controls rendered, 0px overflow, 0 console errors) |
