# Phase 0 — Security Remediation Design

## 1. `SEC-001` — Cryptographically Signed Customer Sessions
- **Original Behavior:** `customer_auth` cookie stores raw `customer.id` (`cuid`); all `/api/customer/*` and `/api/auth/customer/me` routes trust it directly.
- **Proposed Behavior:**
  - Add `CustomerSession` (`customerId`, `phone`, `exp`), `signCustomerToken()`, and `verifyCustomerToken()` in `lib/auth.ts` using HMAC-SHA256 + `crypto.timingSafeEqual` with a dedicated `CUSTOMER_JWT_SECRET || ADMIN_JWT_SECRET` (30-day expiry).
  - Add `lib/customer-auth.ts` exporting `getCustomerFromRequest(request)` and `authorizeCustomer(request)` returning `{ session }` or `{ errorResponse: 401 }`.
  - Update `/api/auth/customer/login` and `/api/auth/customer/register` to set `customer_auth` to the signed token (with `httpOnly: true`, `sameSite: "lax"`, `secure: process.env.NODE_ENV === "production"`).
  - Update `/api/auth/customer/me`, `/api/customer/appointments`, `/api/customer/appointments/[id]`, `/api/customer/profile`, `/api/customer/notifications` to use `authorizeCustomer(request)`.
- **Files Affected:** `lib/auth.ts`, `lib/customer-auth.ts` (new), `app/api/auth/customer/login/route.ts`, `app/api/auth/customer/register/route.ts`, `app/api/auth/customer/me/route.ts`, `app/api/customer/appointments/route.ts`, `app/api/customer/appointments/[id]/route.ts`, `app/api/customer/profile/route.ts`, `app/api/customer/notifications/route.ts`.
- **Potential Regressions:** Existing unsigned `customer_auth` cookies in browsers will be rejected (401) and require re-login.

## 2. `SEC-002` — Centralized Authorization on Legacy REST Endpoints
- **Original Behavior:** `/api/appointments*`, `/api/barbers*`, `/api/services*` have zero auth checks.
- **Proposed Behavior (Preserving `/admin/barbers` & Public Reads):**
  - `app/api/appointments/route.ts` & `app/api/appointments/[id]/route.ts`: Require `authorizeAdmin(request)` on all `GET`, `POST`, `PUT`, `DELETE` handlers (or return `410 Gone` if unused, though protecting with `authorizeAdmin` is zero-risk for any caller).
  - `app/api/barbers/route.ts` & `app/api/barbers/[id]/route.ts`: Keep `GET` public for active barbers (and **remove** the `appointments` query from public `GET /api/barbers/[id]` unless `getAdminFromRequest(request)` is valid!), and require `authorizeAdmin(request, "OWNER")` on `POST`, `PUT`, `DELETE`. This keeps `/admin/barbers` (`AdminBarbersClient.tsx`) working seamlessly for logged-in owners!
  - `app/api/services/route.ts` & `app/api/services/[id]/route.ts`: Keep `GET` public for active services; require `authorizeAdmin(request, "OWNER")` on `POST`, `PUT`, `DELETE`.
  - `app/api/auth/login/route.ts`: Add `checkRateLimit` matching `/api/admin/auth/login` or forward/deprecate in favor of `/api/admin/auth/login`, and fix `admin_auth` cookie to store the signed `token` instead of `"true"`.

## 3. `SEC-003` — Secret Configuration & Startup Validation
- **Original Behavior:** `AUTH_SECRET` in `lib/auth.ts` and `lib/edge-auth.ts` falls back to `"koroush-barber-luxury-secret-key-2026"`.
- **Proposed Behavior:**
  - Introduce `getAuthSecret()` in `lib/auth.ts` and `lib/edge-auth.ts`:
    - In `process.env.NODE_ENV === "production"` (excluding Next.js build phase `NEXT_PHASE === "phase-production-build"`), throw a fatal error if neither `ADMIN_JWT_SECRET` nor `NEXTAUTH_SECRET` is set (or if length < 32).
    - In `development`/`test` only, allow a clearly labeled ephemeral/dev-only fallback so local `ts-node` tests continue to run without `.env` edits.
  - Use `crypto.timingSafeEqual` in `lib/auth.ts` (`verifyAdminToken` & `verifyCustomerToken`).

## 4. `SEC-004` — Remove Production-Visible Default Credentials
- **Original Behavior:** `app/admin-login/page.tsx` pre-fills `admin`/`admin123456` and displays clickable `admin` & `staff` credential cards in all environments.
- **Proposed Behavior:**
  - Initialize `username` and `password` state to `""` by default.
  - Render the Demo Credentials Quick-Select block **only** when `process.env.NODE_ENV !== "production"` (passed from a Server Component wrapper `app/admin-login/page.tsx` -> `AdminLoginClient.tsx`, or gated via server-evaluated prop `showDemoCredentials={process.env.NODE_ENV !== "production"}`).
  - Note: Local Playwright tests (`test/admin_login_browser.js`, etc.) explicitly `page.fill(...)` username & password, so clearing default `useState` values preserves all E2E tests!

## 5. `SEC-005` — OTP Rate Limiting & Abuse Prevention
- **Original Behavior:** `POST /api/booking/otp/send` checks only a 2-minute DB cooldown per phone number.
- **Proposed Behavior:**
  - Apply `checkRateLimit(\`otp_ip_\${ip}\`, 5, 10 * 60 * 1000)` (bypassing or raising limit only for `isLocalhost && NODE_ENV !== "production"` just like `/api/admin/auth/login`).
  - Also apply `checkRateLimit(\`otp_phone_\${normalizedPhone}\`, 3, 15 * 60 * 1000)` to prevent repeated bombing across rotating IPs.
