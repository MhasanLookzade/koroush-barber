# Phase 0 — Phased Implementation Plan

## Recommended Safest Implementation Order

### Step 1: Secret & Auth Foundations (`SEC-003`, `SEC-001`)
1. Update `lib/auth.ts` and `lib/edge-auth.ts`:
   - Enforce `ADMIN_JWT_SECRET` in production runtime (`NODE_ENV === "production"` & not build phase).
   - Use `crypto.timingSafeEqual` in `verifyAdminToken`.
   - Add `signCustomerToken()` and `verifyCustomerToken()`.
2. Create `lib/customer-auth.ts` (`getCustomerFromRequest`, `authorizeCustomer`).
3. Update `app/api/auth/customer/login`, `register`, `me` and `app/api/customer/*` to issue and verify signed `customer_auth` tokens.
- *Acceptance Criteria:* Forged `customer_auth=<id>` returns `401`; valid login/register flow works identically for UI.
- *Rollback:* Revert `lib/auth.ts`, `lib/edge-auth.ts`, `lib/customer-auth.ts`, and customer route files.

### Step 2: Lock Down Legacy Endpoints & Login Hardening (`SEC-002`, `SEC-004`, `SEC-005`)
4. Add `authorizeAdmin` / `authorizeAdmin(..., "OWNER")` to:
   - `app/api/appointments/route.ts`, `app/api/appointments/[id]/route.ts`
   - `app/api/barbers/route.ts`, `app/api/barbers/[id]/route.ts` (keep `GET` public, strip `appointments` unless admin)
   - `app/api/services/route.ts`, `app/api/services/[id]/route.ts` (keep `GET` public)
   - `app/api/auth/login/route.ts` (add `checkRateLimit` and store signed token in `admin_auth`)
5. Update `app/admin-login/page.tsx` -> server/client split so demo credentials only appear in non-production and inputs start empty.
6. Add IP + per-phone `checkRateLimit` to `app/api/booking/otp/send/route.ts`.
- *Affected Features Check:* Verify `/admin/barbers` (`AdminBarbersClient.tsx`) continues working when authenticated as `OWNER`, and `test/admin_login_browser.js` passes.

### Step 3: Booking Financial Consistency & Concurrency (`BUG-001`, `BUG-003`, `BUG-005`)
7. Extract `computeServiceDeposit()` in `lib/booking-engine.ts`; update `app/api/booking/pay/route.ts` to use `appointment.totalPrice - appointment.balanceDue` (and `computeServiceDeposit`), enforce `HELD`/`AWAITING_PAYMENT` status, and match `customerPhone` on `SlotHold`.
8. Add PostgreSQL partial unique indexes (`SlotHold_active_slot_unique`, `Appointment_confirmed_slot_unique`) + `P2002`/`P2034` conflict handling and same-user re-hold cleanup in `reserveSlotHold()`.

### Step 4: SMS Decoupling, Reschedule Fix, & HTTP Resilience (`BUG-004`, `BUG-002`, `REL-001`)
9. Move `sms.sendBookingConfirmation()` outside `prisma.$transaction()` in `handlePaymentCallback()`.
10. Update `app/api/admin/appointments/reschedule/route.ts` to call `getSmsProvider().sendCustomSms()` after transaction commit and log real `SENT`/`FAILED` status.
11. Add `AbortSignal.timeout(10000)` and `res.ok` / safe JSON parsing to `lib/providers/payment.ts` and `lib/providers/sms.ts`, and preserve `PENDING` state on transient verification network timeouts.

---

## Files Requiring Modification (Summary)
- `lib/auth.ts`, `lib/edge-auth.ts`, `lib/customer-auth.ts` (new), `lib/booking-engine.ts`, `lib/providers/payment.ts`, `lib/providers/sms.ts`
- `app/admin-login/page.tsx` (+ client component if split)
- `app/api/auth/login/route.ts`, `app/api/auth/customer/{login,register,me}/route.ts`
- `app/api/customer/{appointments/route.ts,appointments/[id]/route.ts,profile/route.ts,notifications/route.ts}`
- `app/api/appointments/{route.ts,[id]/route.ts}`, `app/api/barbers/{route.ts,[id]/route.ts}`, `app/api/services/{route.ts,[id]/route.ts}`
- `app/api/booking/{pay/route.ts,otp/send/route.ts}`
- `app/api/admin/appointments/reschedule/route.ts`
- `prisma/migrations/<timestamp>_slot_unique_indexes/migration.sql` (new migration)
