# Phase 0 — Validated Findings Report

Each of the 10 scoped findings was independently re-verified by reopening the original source files, tracing all callers/consumers, checking middleware/auth guards, inspecting database constraints, and checking existing test coverage.

---

## Summary Table

| ID | Classification | Confidence | Existing Test Coverage | Mitigating Controls Found |
|---|---|---|---|---|
| **SEC-001** | **Confirmed** | High | None | None (`customer_auth` is raw `customer.id`) |
| **SEC-002** | **Confirmed** | High | None | None on `/api/appointments*`, `/barbers*`, `/services*` (Note: `/admin/barbers` actively calls `/api/barbers` & `/api/services`) |
| **SEC-003** | **Confirmed** | High | `acceptance.test.ts` #14 tests signed token, not missing secret | `compose.production.yml` requires `.env.production`, `deploy-ubuntu.sh` generates secret, but app code lacks fail-fast |
| **SEC-004** | **Confirmed** | High | `admin_login_browser.js` uses login form | None in `app/admin-login/page.tsx` |
| **SEC-005** | **Confirmed** | High | None | 2-minute per-phone cooldown exists, but zero IP rate limit |
| **BUG-001** | **Confirmed** | High | `acceptance.test.ts` uses default `fixed` services only | None for `depositType === "percentage"` |
| **BUG-002** | **Confirmed** | High | `master_ux_reschedule_e2e.js` checks modal UI only | None |
| **BUG-003** | **Confirmed (Static / Requires PG Test)** | High (for PG risk) | `database_isolation.test.ts` #3 runs on SQLite `dev.db`, NOT PostgreSQL | SQLite serializes writes locally; PostgreSQL `ReadCommitted` does NOT |
| **BUG-004** | **Confirmed** | High | `acceptance.test.ts` #3 runs with fast in-memory `MockSmsProvider` | `try/catch` prevents SMS error from throwing, but does NOT prevent Prisma 5s tx timeout on slow network |
| **REL-001** | **Confirmed** | High | None (all tests use `MOCK` gateway & SMS) | `try/catch` in `sms.ts`, none in `payment.ts` `ZarinPalPaymentGatewayImpl` |

---

## Detailed Independent Verification

### 1. `SEC-001` — Unsigned `customer_auth` Cookie
- **Classification:** **Confirmed**
- **Evidence:**
  - `app/api/auth/customer/login/route.ts:67`: `response.cookies.set("customer_auth", customer.id, ...)`
  - `app/api/auth/customer/register/route.ts:76`: `response.cookies.set("customer_auth", customer.id, ...)`
  - `app/api/auth/customer/me/route.ts:8-15`, `app/api/customer/appointments/route.ts:15`, `app/api/customer/appointments/[id]/route.ts:9,41`, `app/api/customer/notifications/route.ts:13,63`, `app/api/customer/profile/route.ts:19,52` all read `request.cookies.get("customer_auth")?.value` directly as `customerId` with zero signature verification.
- **Exploitability:** Trivially exploitable by setting `Cookie: customer_auth=<target_customer_id>`.

### 2. `SEC-002` — Unauthenticated Legacy REST API Endpoints
- **Classification:** **Confirmed**
- **Evidence & Caller Trace:**
  - `middleware.ts:40` matches ONLY `["/admin/:path*"]`, leaving `/api/*` unprotected by middleware.
  - `app/api/appointments/route.ts:15-107` & `app/api/appointments/[id]/route.ts:13-78`: zero auth. Callers found: orphaned `AdminDashboardClient.tsx` and `AdminAppointmentsClient.tsx` (neither is imported by live pages `app/(admin)/admin/page.tsx` or `appointments/page.tsx`).
  - `app/api/barbers/route.ts:22-70` & `app/api/barbers/[id]/route.ts:24-112`: zero auth (`GET /[id]` also leaks `appointments`). **Important consumer discovered:** `app/(admin)/admin/barbers/AdminBarbersClient.tsx:147,208,245,264` (mounted at `/admin/barbers`) actively calls `GET/POST /api/barbers`, `PUT/DELETE /api/barbers/[id]`, and `GET /api/services`!
  - `app/api/services/route.ts:27-47` & `app/api/services/[id]/route.ts:36-72`: zero auth on `POST`, `PUT`, `DELETE`.
- **Conclusion:** `/api/appointments*` can be locked down or removed; `/api/barbers*` and `/api/services*` MUST keep `GET` public (without appointment PII!) and enforce `authorizeAdmin` on `POST`/`PUT`/`DELETE` so `/admin/barbers` continues working.

### 3. `SEC-003` — Hardcoded `AUTH_SECRET` Fallback
- **Classification:** **Confirmed**
- **Evidence:** `lib/auth.ts:12` and `lib/edge-auth.ts:14-17` both fall back to `"koroush-barber-luxury-secret-key-2026"`.

### 4. `SEC-004` — Exposed Default Admin & Staff Credentials
- **Classification:** **Confirmed**
- **Evidence:** `app/admin-login/page.tsx:15-16` initializes `useState("admin")` / `useState("admin123456")`; lines `146-186` render clickable buttons displaying `admin / admin123456` and `staff / staff123456` with no `NODE_ENV` check.

### 5. `SEC-005` — Missing OTP Rate Limiting
- **Classification:** **Confirmed**
- **Evidence:** `app/api/booking/otp/send/route.ts:6-53` checks `otpChallenge` created in last 2 minutes for the same `phone`, but never calls `checkRateLimit(ip, ...)` from `lib/rate-limit.ts`. Attackers can pump SMS to arbitrary distinct numbers.

### 6. `BUG-001` — Incorrect Percentage-Based Deposit Calculation
- **Classification:** **Confirmed**
- **Evidence:** `lib/booking-engine.ts:318-320` computes `Math.round((totalPrice * service.depositPercent) / 100)` when `depositType === "percentage"`, whereas `app/api/booking/pay/route.ts:80` ignores `depositType`/`depositPercent` and uses `appointment.service.depositPrice || 50000`. All seed services currently use `depositType: "fixed"`, hiding this bug in existing tests.

### 7. `BUG-002` — Fake `SENT` SMS on Admin Reschedule
- **Classification:** **Confirmed**
- **Evidence:** `app/api/admin/appointments/reschedule/route.ts:154-166` writes `NotificationJob` with `status: "SENT"`, `provider: "SMS_IR"` inside `prisma.$transaction` without importing or calling `getSmsProvider()`.

### 8. `BUG-003` — Concurrent Booking / Slot Hold Race Conditions
- **Classification:** **Confirmed (via static analysis; requires PostgreSQL concurrency test)**
- **Evidence:** `lib/booking-engine.ts:324-434` (`reserveSlotHold`) uses default `ReadCommitted` isolation in PostgreSQL, and `prisma/migrations/20261124000000_init/migration.sql` contains only non-unique indexes on `SlotHold(barberId, slotTime)` and `Appointment(barberId, date)`. Local `test:db` passed only because SQLite serializes writes at the file level.

### 9. `BUG-004` — External HTTP Request Inside Prisma Transaction
- **Classification:** **Confirmed**
- **Evidence:** `lib/booking-engine.ts:544-684` (`handlePaymentCallback`) calls `await sms.sendBookingConfirmation(...)` at line `652` inside `prisma.$transaction(async (tx) => ...)`.

### 10. `REL-001` — Missing HTTP Timeout & Response Validation
- **Classification:** **Confirmed**
- **Evidence:** `lib/providers/payment.ts:151-196` (`ZarinPalPaymentGatewayImpl`) and `lib/providers/sms.ts:166-258` (`KavenegarSmsProviderImpl`) call `fetch()` with no `AbortSignal.timeout` and call `await res.json()` without checking `res.ok` or content-type.

---

## Additional Problems Discovered During Verification
1. **`app/api/auth/login/route.ts` (Legacy Admin Login):** Duplicate login endpoint with **no rate limiting** (unlike `/api/admin/auth/login`) and sets `admin_auth="true"` (unverified string) alongside `admin_token`.
2. **Orphaned Legacy Admin Client Files:** `app/(admin)/admin/AdminDashboardClient.tsx` and `app/(admin)/admin/appointments/AdminAppointmentsClient.tsx` are unused dead code still calling `/api/appointments`.
