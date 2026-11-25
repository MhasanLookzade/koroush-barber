# 19 — Improvement and Remediation Roadmap

## Phase A — Immediate Critical Corrections (Pre-Launch Blockers)
1. **Fix `SEC-002` (Protect/Remove Legacy Unauthenticated APIs)**
   - *Affected:* `app/api/appointments/*`, `app/api/barbers/*`, `app/api/services/*`
   - *Changes:* Add `authorizeAdmin(request, "OWNER")` to mutating service/barber endpoints and `authorizeAdmin(request)` to `/api/appointments*` (or delete unused legacy routes); remove `appointments` relation from public `GET /api/barbers/[id]`.
   - *Validation:* Automated unauthenticated `GET/POST/PUT/DELETE` requests must return `401`.
   - *Complexity:* Low | *Risk:* Low | *Rollback:* Revert route files.
2. **Fix `SEC-001` (Sign `customer_auth` Session Cookies)**
   - *Affected:* `lib/auth.ts`, `app/api/auth/customer/*`, `app/api/customer/*`
   - *Changes:* Add `signCustomerToken()` / `verifyCustomerToken()` using HMAC-SHA256 and replace raw `customer.id` cookie reads with verified token extraction.
   - *Validation:* Forged `customer_auth=<cuid>` cookie must return `401`.
   - *Complexity:* Medium | *Risk:* Low (logs out existing dev sessions) | *Rollback:* Revert auth helper.
3. **Fix `SEC-003` & `SEC-004` (Remove Hardcoded Secrets & Demo Login Credentials)**
   - *Affected:* `lib/auth.ts`, `lib/edge-auth.ts`, `app/admin-login/page.tsx`
   - *Changes:* Fail startup in `NODE_ENV=production` if `ADMIN_JWT_SECRET` is unset; remove pre-filled credentials and hide quick-fill buttons in production.
   - *Complexity:* Low | *Rollback:* Restore env/UI flags.

## Phase B — High-Priority Security, Correctness & Reliability
4. **Fix `BUG-001` & `BUG-005` (Deposit Parity & Hold Ownership)**
   - *Affected:* `lib/booking-engine.ts`, `app/api/booking/pay/route.ts`
   - *Changes:* Share `computeServiceDeposit()`, enforce `status in ["HELD", "AWAITING_PAYMENT"]`, and match `customerPhone` on `SlotHold`.
5. **Fix `BUG-004` & `REL-001` (Move SMS Outside DB Tx & Add HTTP Timeouts)**
   - *Affected:* `lib/booking-engine.ts`, `lib/providers/payment.ts`, `lib/providers/sms.ts`
   - *Changes:* Execute `sms.sendBookingConfirmation()` after `prisma.$transaction()` resolves; add `AbortSignal.timeout(10000)` and `res.ok` / safe JSON checks.
6. **Fix `BUG-003` (PostgreSQL Concurrency Protection)**
   - *Affected:* `lib/booking-engine.ts`, `prisma/migrations/`
   - *Changes:* Use `Serializable` transaction isolation (with retry) and/or PostgreSQL partial unique indexes for active holds and confirmed slots.
7. **Fix `BUG-002` & `SEC-005` (Real Reschedule SMS & OTP IP Rate Limit)**
   - *Affected:* `app/api/admin/appointments/reschedule/route.ts`, `app/api/booking/otp/send/route.ts`

## Phase C — Stability, Operational & UX Polish
8. **Fix `SEC-006`, `SEC-007`, `SEC-008`, `SEC-009`:** `timingSafeEqual`, higher-entropy tracking code + rate limit on `/cancel`, same-origin check on mock payment callback, Nginx header snippet + `limit_req_zone`.
9. **Fix `BUG-006`, `BUG-007`, `BUG-009`, `OPS-001`:** Redirect `/dashboard` to `/auth` when 401, unify customer cancellation with 12h cutoff, read `WorkingHour` in `getAvailabilityForDate()`, add `.eslintrc.json`.

## Phase D — Maintainability & Technical Debt
10. **Fix `BUG-008`, `BUG-010`, `PERF-001`, `PERF-002`:** Add scheduled cron runner for reminders/birthdays, align salon domain/address/images, cap mock stores, and decompose `BookingStudio.tsx`, `admin/page.tsx`, `admin/sms/page.tsx`.
