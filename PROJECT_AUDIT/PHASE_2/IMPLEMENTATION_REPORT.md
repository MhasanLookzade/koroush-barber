# Phase 2 — Implementation Report

**Branch:** `fix/phase-2-api-security`  
**Baseline Backup:** `backup/pre-phase-2` (`edfe2d8`, Phase 1 commit)  
**Pre-Phase-1 Backup:** `backup/pre-phase-1` (`ae409d4`)  
**Scope:** API Security, Authorization, Access Control, Demo Credential Removal, OTP Rate Limiting, `SEC-007`..`SEC-010`, and `/admin/barbers` `ToastProviderComponent` fix. Booking engine (`lib/booking-engine.ts`) and payment logic were untouched.

## Implemented Changes
1. **`SEC-002` (Legacy REST API Security):**
   - Secured `/api/appointments` (`GET`, `POST` -> `authorizeAdmin`), `/api/appointments/[id]` (`GET`, `PUT` -> `authorizeAdmin`; `DELETE` -> `authorizeAdmin(..., "OWNER")`).
   - Preserved public `GET /api/barbers`, `GET /api/barbers/[id]`, `GET /api/services`, `GET /api/services/[id]` while stripping private `email`, `phone`, and `appointments` from unauthenticated responses, and enforcing `authorizeAdmin(request, "OWNER")` on all `POST`, `PUT`, `DELETE` mutations.
2. **`SEC-004` (Production Demo Credential Removal):**
   - Split `app/admin-login/page.tsx` (Server Component) and `app/admin-login/AdminLoginClient.tsx` (Client Component).
   - `AdminLoginClient` starts with empty `""` inputs and contains **zero** hardcoded passwords. `page.tsx` passes `demoAccounts` only when `NODE_ENV !== "production"`. Verified `0` hits in `.next/static` production client JS chunks.
3. **`SEC-005` & `SEC-007` (OTP & Cancel Rate Limiting + Anti-Spoof IP):**
   - Updated `getClientIp()` in `lib/rate-limit.ts` to prefer Nginx-set `x-real-ip` or rightmost `x-forwarded-for` hop.
   - Added IP rate limit (`5/10m`), phone burst limit (`3/15m`), and persistent 24h DB limit (`8/day`) to `POST /api/booking/otp/send` while keeping the 2-minute resend cooldown.
   - Added IP rate limit (`10/10m`) to `POST /api/booking/cancel`.
4. **`SEC-008`, `SEC-009`, `SEC-010`:**
   - Added same-origin check on `callback` in `app/payment/mock/[authority]/page.tsx`.
   - Fixed Nginx static `location` header inheritance and added `limit_req_zone` rules in `deploy/nginx/koroushbarber.conf`.
   - Bound dev PostgreSQL port in `docker-compose.yml` to `127.0.0.1:5432`.
5. **Admin Barbers `ToastProviderComponent` Fix:**
   - Wrapped `AdminBarbersContent` in `<ToastProviderComponent>` inside `app/(admin)/admin/barbers/AdminBarbersClient.tsx`.
