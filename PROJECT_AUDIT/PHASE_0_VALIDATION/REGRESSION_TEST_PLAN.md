# Phase 0 — Regression Test Plan

## 1. Existing Suites That Must Continue Passing 100%
1. `npx tsc --noEmit` (0 errors)
2. `npm run test:acceptance` (32/32 scenarios)
3. `npm run test:db` (22/22 scenarios on clean DB)
4. `npm run build` (all 50 routes)
5. `node test/admin_login_browser.js` & `node test/auth_test.js`
6. `node test/e2e_responsive.js` & `node test/admin_responsive.js`

## 2. New Automated Verification Cases Required per Fix

| Fix ID | Test Case Description | Expected Result |
|---|---|---|
| `SEC-001` | Send `GET /api/customer/appointments` and `/api/auth/customer/me` with forged `Cookie: customer_auth=<valid_cuid>` | HTTP `401` |
| `SEC-001` | Login via `POST /api/auth/customer/login` and reuse returned `Set-Cookie` on `/api/customer/profile` | HTTP `200` with authenticated profile |
| `SEC-002` | Send unauthenticated `GET/POST /api/appointments`, `PUT/DELETE /api/appointments/1`, `POST/PUT/DELETE /api/services`, `POST/PUT/DELETE /api/barbers` | HTTP `401` on all |
| `SEC-002` | Authenticated `OWNER` manages barbers via `/admin/barbers` (`GET/POST/PUT/DELETE /api/barbers`) | HTTP `200`/`201` |
| `SEC-003` | Unset `ADMIN_JWT_SECRET` & `NEXTAUTH_SECRET` with `NODE_ENV=production` | Fails fast with explicit secret error |
| `SEC-004` | Render `/admin-login` in `NODE_ENV=production` build | Inputs empty; `admin123456` / `staff123456` absent from HTML & JS payload |
| `SEC-005` | Call `POST /api/booking/otp/send` 6 times from same IP with different phones | 6th request returns HTTP `429` |
| `BUG-001` | Create `percentage` service (`price=1000000`, `depositType="percentage"`, `depositPercent=30`, `depositPrice=0`), hold slot, call `/api/booking/pay` | `Payment.amountToman === 300000` (not `50000`) |
| `BUG-002` | Call `POST /api/admin/appointments/reschedule` in `MOCK` mode | `MockSmsProvider.sentMessages` receives reschedule SMS; `NotificationJob.provider === "MOCK"` |
| `BUG-003` | Execute `Promise.all` with 5 concurrent `reserveSlotHold()` calls on same slot (including PostgreSQL target) | Exactly 1 succeeds, 4 receive conflict error |
| `BUG-004` | Simulate slow `SmsProvider` (delay >6s) during `handlePaymentCallback()` | Appointment still transitions to `CONFIRMED` & `Payment` stays `VERIFIED` |
| `BUG-005` | Call `POST /api/booking/pay` on `CANCELLED` appointment or while different phone holds the slot | HTTP `400`/`410` rejection |
| `REL-001` | Mock `fetch` returning HTTP `502 Bad Gateway` HTML or hanging beyond timeout in `ZarinPalPaymentGatewayImpl` / `KavenegarSmsProviderImpl` | Clean error returned without `SyntaxError` crash; appointment NOT cancelled on timeout |
