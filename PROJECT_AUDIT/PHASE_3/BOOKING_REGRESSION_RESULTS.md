# Phase 3 — Booking & Concurrency Regression Results

**Test Suite:** `npx ts-node test/phase3_postgres_concurrency.test.ts` (`PostgreSQL 16.16`) + `npm run test:db` + `npm run test:acceptance`  

---

## 1. Phase 3 PostgreSQL Booking & Concurrency Results (29/29 PASS)

| Test Case | Outcome |
|---|---|
| Unauthorized `customerPhone` payment attempt rejected (`403`) | **PASS** |
| Mismatched `customer_auth` cookie rejected (`403`) | **PASS** |
| Active hold belonging to another `customerPhone` returns `403` | **PASS** |
| Callback against expired hold does NOT confirm appointment (routes to `PAYMENT_REVIEW`) | **PASS** |
| Payment initiation against expired hold returns `410` | **PASS** |
| 2 concurrent `reserveSlotHold` calls on same slot: strictly 1 succeeds, 1 rejected | **PASS** |
| 10 simultaneous `reserveSlotHold` calls on same slot: strictly 1 succeeds, 9 rejected | **PASS** |
| 2 concurrent `handlePaymentCallback` calls on same `authority`: 1 fresh confirm, 1 idempotent repeat, 1 SMS job | **PASS** |
| PostgreSQL partial unique index `SlotHold_active_slot_unique` rejects duplicate `ACTIVE` hold (`P2002`) | **PASS** |
| PostgreSQL partial unique index `Appointment_confirmed_slot_unique` rejects duplicate `CONFIRMED` appointment (`P2002`) | **PASS** |
| Concurrent confirmation & cancellation race resolves consistently without double-booking | **PASS** |

---

## 2. Preserved Regression Suites

| Suite | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (`0` errors) |
| `npx ts-node test/phase1_auth_security.test.ts` | **PASS** (`13 PASSED, 0 FAILED`) |
| `npx ts-node test/phase2_api_security.test.ts` | **PASS** (`9 PASSED, 0 FAILED`) |
| `npm run test:db` (clean baseline) | **PASS** (`22 PASSED, 0 FAILED`) |
| `npm run test:acceptance` | **PASS** (`32 PASSED, 0 FAILED`) |
| `npm run build` | **PASS** (`50/50` routes compiled) |
| `node test/auth_test.js` | **PASS** (`6/6` checks) |
| `node test/admin_login_browser.js` | **PASS** |
| `node test/e2e_responsive.js` | **PASS** (`11/11` viewports, `0px` overflow, `0` console errors) |
