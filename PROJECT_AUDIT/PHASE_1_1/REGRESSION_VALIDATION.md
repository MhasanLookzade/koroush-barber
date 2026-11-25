# Phase 1.1 — Regression Validation

## 1. Automated & Live HTTP Security Tests Executed
- **`npx ts-node test/phase1_auth_security.test.ts`:** **13/13 PASS**
  - Modified customer ID in payload -> rejected (`null`)
  - Tampered signature -> rejected (`null`)
  - Expired customer & admin tokens -> rejected (`null`)
  - Admin token submitted to `verifyCustomerToken` & customer token submitted to `verifyAdminToken`/`verifyAdminTokenEdge` -> rejected (`null`)
  - Raw unsigned `customer_auth` cookie -> `401` on `/api/auth/customer/me` & `/api/customer/appointments`
  - Missing session -> `401`
  - `STAFF` calling `OWNER`-only `authorizeAdmin(req, "OWNER")` -> `403`
  - Missing / short / insecure fallback production secrets -> throws error
- **Live HTTP Negative & Positive Checks (`http://localhost:3000`):**
  - Unsigned `Cookie: customer_auth=clxyz123456` on `/api/auth/customer/me`, `/api/customer/appointments`, `/api/customer/profile`, `/api/customer/notifications` -> **401, 401, 401, 401**
  - Admin `OWNER` token submitted as `customer_auth` to `/api/customer/profile` -> **401**
  - `STAFF` token on `POST /api/admin/settings` (`OWNER`-only) -> **403**
  - Legacy `POST /api/auth/login` -> `200`, sets signed `admin_auth` (no `admin_auth=true;`)
  - Unauthenticated `/admin` & `/admin/barbers` -> **307** redirect to `/admin-login`
  - Authenticated `OWNER` on `/admin`, `/admin/appointments`, `/admin/customers`, `/admin/birthdays`, `/admin/sms`, `/admin/services`, `/admin/availability`, `/admin/payments`, `/admin/reviews`, `/admin/settings` -> **200 OK** on all 10 routes
  - Authenticated `OWNER` on `/admin/barbers` -> passed Phase 1 auth guard, hit pre-existing `useToast` provider error (`500`, unrelated to auth)
- **Baseline Suites:** `npx tsc --noEmit` (0 errors), `npm run test:acceptance` (32/32), `npm run test:db` (22/22), `npm run build` (50/50), `node test/auth_test.js` (6/6), `node test/admin_login_browser.js` (PASS).

## 2. Git & Change Integrity
- `backup/pre-phase-1` exists and points to `ae409d47592ce196a5677fe9e820054e833865fa` (`main` unchanged).
- All 12 modified files and 2 added files (`lib/customer-auth.ts`, `test/phase1_auth_security.test.ts`) are strictly scoped to Phase 1 auth/session security. Zero secrets committed; zero temporary debug code left behind.
