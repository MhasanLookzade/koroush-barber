# Phase 2 — Regression Test Results

All suites below were executed after the final Phase 2 edit.

| Command / Suite | Result | Details |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | 0 errors |
| `npx ts-node test/phase1_auth_security.test.ts` | **PASS** | **13 PASSED, 0 FAILED** (Phase 1 auth & session checks intact) |
| `npx ts-node test/phase2_api_security.test.ts` | **PASS** | **9 PASSED, 0 FAILED** (401/403 RBAC, public GET PII stripping, IP/OTP/cancel rate limits, zero hardcoded passwords) |
| `npm run test:acceptance` | **PASS** | **32 PASSED, 0 FAILED** |
| `npm run test:db` | **PASS** | **22 PASSED, 0 FAILED** (clean DB baseline verified) |
| `npm run build` | **PASS** | 50/50 routes built; `.next/static` scan confirmed 0 demo credentials |
| `node test/auth_test.js` | **PASS** | 6/6 admin/staff API checks |
| `node test/admin_login_browser.js` | **PASS** | Mobile login & `/admin` dashboard E2E |
| Live Chromium `/admin/barbers` check | **PASS** | HTTP `200`, `0` console/page errors |
| `node test/e2e_responsive.js` | **PASS** | 11/11 viewports, 0px overflow, 0 console errors |
| `node test/admin_responsive.js` | **PASS** | 40/40 admin route × viewport checks, 0px overflow |
