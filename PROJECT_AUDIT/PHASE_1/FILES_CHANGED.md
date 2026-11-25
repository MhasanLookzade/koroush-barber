# Phase 1 — Files Changed

| File | Action | Reason |
|---|---|---|
| `lib/auth.ts` | Modified | Added `getAuthSecret()` fail-closed prod validation, `timingSafeMatch()` via `crypto.timingSafeEqual`, `tokenType` checks, and `signCustomerToken()` / `verifyCustomerToken()`. |
| `lib/edge-auth.ts` | Modified | Synced `getEdgeAuthSecret()` validation, `constantTimeEqual()`, and `tokenType` enforcement with `lib/auth.ts`. |
| `lib/customer-auth.ts` | Created | Centralized `getCustomerFromRequest()` and `authorizeCustomer()` helpers for signed `customer_auth` verification. |
| `app/api/auth/customer/login/route.ts` | Modified | Replaced raw `customer.id` cookie with `signCustomerToken()` signed cookie. |
| `app/api/auth/customer/register/route.ts` | Modified | Replaced raw `customer.id` cookie with `signCustomerToken()` signed cookie. |
| `app/api/auth/customer/me/route.ts` | Modified | Replaced raw cookie read with `getCustomerFromRequest()`. |
| `app/api/customer/appointments/route.ts` | Modified | Replaced raw cookie read with `authorizeCustomer()`. |
| `app/api/customer/appointments/[id]/route.ts` | Modified | Replaced raw cookie reads (`GET`, `PATCH`) with `authorizeCustomer()`. |
| `app/api/customer/profile/route.ts` | Modified | Replaced raw cookie reads (`GET`, `PATCH`) with `authorizeCustomer()`. |
| `app/api/customer/notifications/route.ts` | Modified | Replaced raw cookie reads (`GET`, `PATCH`) with `authorizeCustomer()`. |
| `app/api/auth/login/route.ts` | Modified | Added IP `checkRateLimit`, `lastLoginAt` update, and signed `token` in `admin_auth` cookie (removed `"true"` shortcut). |
| `app/api/auth/logout/route.ts` | Modified | Cleared both `admin_token` and `admin_auth` cookies. |
| `app/(admin)/admin/barbers/page.tsx` | Modified | Added `verifyAdminToken(token)` verification before rendering. |
| `test/phase1_auth_security.test.ts` | Created | Automated 13-case regression test suite for Phase 1 auth & session security. |
