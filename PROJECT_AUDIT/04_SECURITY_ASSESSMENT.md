# 04 — Security Assessment

All findings below are verified directly in source code and mapped to CWE and OWASP Top 10 (2021).

---

## 1. Critical Security Weaknesses

### `SEC-001` — Unsigned `customer_auth` Cookie (Account Takeover)
- **Severity:** CRITICAL | **CWE:** CWE-287 / CWE-384 | **OWASP:** A07:2021
- **Evidence:** `app/api/auth/customer/login/route.ts:67`, `app/api/auth/customer/register/route.ts:76`, `app/api/auth/customer/me/route.ts:8-15`, `app/api/customer/appointments/route.ts:15`, `app/api/customer/profile/route.ts:19,52`, `app/api/customer/notifications/route.ts:13,63`.
- **Details:** `customer_auth` stores the raw `customer.id` (`cuid`) without any cryptographic signature. Any attacker who supplies `Cookie: customer_auth=<id>` gains full access to that customer's profile, appointments, notifications, and password/profile updates.
- **Remediation Plan:** Implement HMAC-SHA256 signed customer session tokens (mirroring `signAdminToken`/`verifyAdminToken`) and enforce verification in a centralized `getCustomerFromRequest(request)` helper.

### `SEC-002` — Unauthenticated Legacy CRUD APIs (Mass PII Breach & Price Tampering)
- **Severity:** CRITICAL | **CWE:** CWE-306 / CWE-862 | **OWASP:** A01:2021
- **Evidence:**
  - `app/api/appointments/route.ts:15-107` (`GET`, `POST`) — `GET` dumps all appointments with unmasked `customerName`, `customerPhone`, `customerEmail`, `customerBirthDate`, and `trackingCode`.
  - `app/api/appointments/[id]/route.ts:13-78` (`GET`, `PUT`, `DELETE`) — Allows unauthenticated modification (including `status: "CONFIRMED"`) and deletion.
  - `app/api/barbers/route.ts:39-70` (`POST`) & `app/api/barbers/[id]/route.ts:24-112` (`GET`, `PUT`, `DELETE`) — Leaks future appointments and allows modifying/deleting barbers.
  - `app/api/services/route.ts:27-47` (`POST`) & `app/api/services/[id]/route.ts:36-72` (`PUT`, `DELETE`) — Allows setting any service `price` to `1` Toman or deleting services.
- **Remediation Plan:** Immediately remove unused legacy routes or wrap every handler with `authorizeAdmin(request)` / `authorizeAdmin(request, "OWNER")` and strip PII from public `GET /api/barbers/[id]`.

---

## 2. High-Severity Security Weaknesses

### `SEC-003` — Hardcoded Fallback `AUTH_SECRET`
- **Severity:** HIGH | **CWE:** CWE-798 | **OWASP:** A07:2021
- **Evidence:** `lib/auth.ts:12` and `lib/edge-auth.ts:14-17` both default to `"koroush-barber-luxury-secret-key-2026"`.
- **Remediation Plan:** Refuse to start in `NODE_ENV === "production"` if `ADMIN_JWT_SECRET` is unset or weak.

### `SEC-004` — Production Exposure of Demo Admin Credentials
- **Severity:** HIGH | **CWE:** CWE-798 / CWE-200 | **OWASP:** A05:2021
- **Evidence:** `app/admin-login/page.tsx:15-17` pre-fills `"admin"` / `"admin123456"`, and lines `146-186` render clickable buttons displaying `admin / admin123456` and `staff / staff123456`.
- **Remediation Plan:** Remove hardcoded defaults and hide quick-fill demo UI unless `process.env.NODE_ENV !== "production"`.

### `SEC-005` — Unthrottled OTP Send Endpoint (SMS Pumping)
- **Severity:** HIGH | **CWE:** CWE-770 / CWE-307 | **OWASP:** A04:2021
- **Evidence:** `app/api/booking/otp/send/route.ts:6-53` checks a 2-minute per-phone cooldown but has no IP rate limit.
- **Remediation Plan:** Add `checkRateLimit(\`otp_ip_\${ip}\`, 5, 10 * 60 * 1000)` before creating `OtpChallenge` or calling Kavenegar.

---

## 3. Medium & Low Security Weaknesses

- **`SEC-006` (MEDIUM, CWE-208):** `lib/auth.ts:39` and `lib/edge-auth.ts:56` use `!==` instead of constant-time HMAC comparison (`crypto.timingSafeEqual`).
- **`SEC-007` (MEDIUM, CWE-330/CWE-307):** `generateTrackingCode()` (`lib/auth.ts:85-88`) uses only 5 digits (90,000 combinations) and `POST /api/booking/cancel` has no rate limiting.
- **`SEC-008` (MEDIUM, CWE-601):** `app/payment/mock/[authority]/page.tsx:11-26` redirects to an unsanitized `callback` query parameter (Open Redirect).
- **`SEC-009` (MEDIUM, CWE-693):** `deploy/nginx/koroushbarber.conf:132-152` redeclares `add_header Cache-Control` inside static `location` blocks, silently dropping parent `server`-level HSTS/X-Frame-Options/nosniff headers; no CSP or Nginx `limit_req_zone` is configured.
- **`SEC-010` (LOW, CWE-284):** `docker-compose.yml:13-16,44-45` exposes Postgres port `5432` to `0.0.0.0` with default passwords (production `compose.production.yml` correctly avoids this).

---

## 4. Positive Security Controls Verified
- All 15 operational `/api/admin/*` routes call `authorizeAdmin()` (`OWNER` enforced on `payments`, `services`, `settings`).
- `bcrypt` password hashing (`cost 10` for admin, `cost 12` for customer).
- Public `/api/booking/status` masks customer names (`maskCustomerName`) and phones (`maskPhone`), and requires verified 20-minute OTP for phone-based lookups.
- `middleware.ts` sets `X-Robots-Tag: noindex, nofollow, noarchive` on all `/admin/*` paths.
