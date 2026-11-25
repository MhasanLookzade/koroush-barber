# Phase 2.1 — OTP Rate Limit & Abuse Protection Review

**Branch:** `fix/phase-2-api-security`  
**Backup Baseline:** `backup/pre-phase-2` (`edfe2d8a64640ffe6a60782f83955e50149e14be`)  
**Scope:** Independent verification of [`lib/rate-limit.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/rate-limit.ts) and [`app/api/booking/otp/send/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/booking/otp/send/route.ts)

---

## 1. Rate Limit Controls Implemented

1. **In-Memory Sliding/Fixed-Window Store (`lib/rate-limit.ts`)**
   - Uses a process-local `Map` (`rateLimitStore`) with periodic `.unref()` cleanup timer so background cleanup does not prevent graceful process exit.
   - `getClientIp()` prioritizes `x-real-ip` first, then falls back to the rightmost entry in `x-forwarded-for`. This prevents client-side IP spoofing via injected `X-Forwarded-For` headers when deployed behind Nginx (`proxy_set_header X-Real-IP $remote_addr`).

2. **Multi-Layer OTP Send Controls (`app/api/booking/otp/send/route.ts`)**
   - **Per-IP Burst Limit:** `5` requests per `10` minutes (`rateLimitStore`).
   - **Per-Phone Burst Limit:** `3` requests per `15` minutes (`rateLimitStore`).
   - **Per-Phone Daily Persistent Cap:** `8` challenges per day, enforced via `prisma.otpChallenge.count(...)` against PostgreSQL.
   - **Resend Cooldown:** `2`-minute cooldown between consecutive OTP sends to the same phone.
   - **Edge Layer (`deploy/nginx/koroushbarber.conf`):** `limit_req_zone $binary_remote_addr zone=auth_otp_limit:10m rate=10r/m;` applied to `location ~ ^/api/(booking/otp/|admin/auth/|auth/)`.

---

## 2. Classification of Findings & Limitations

| ID | Finding | Status | Severity | Technical Notes |
|---|---|---|---|---|
| OTP-21-01 | **Process-local in-memory burst store** | **Confirmed** | Low / Operational | `rateLimitStore` in `lib/rate-limit.ts` is an in-memory `Map`. It resets on Node.js process restart and is not shared across multiple Node workers or containers. On the current single-VPS, single-container Docker deployment behind Nginx, this is mitigated by Nginx `auth_otp_limit` (shared across edge requests) and the persistent PostgreSQL `8/day` `otpChallenge.count` cap. Multi-instance horizontal scaling in the future will require Redis. |
| OTP-21-02 | **Header spoofing bypass of IP limiter** | **Not Found** | — | `getClientIp()` prefers `x-real-ip` and otherwise takes the rightmost `x-forwarded-for` address, preventing trivial `X-Forwarded-For: 1.2.3.4` spoofing behind Nginx. |
| OTP-21-03 | **Missing OTP rate limiting (SEC-005)** | **Not Found** | — | Multi-layered rate limiting (IP burst, phone burst, 2-min resend cooldown, 8/day DB cap, plus Nginx `10r/m` edge zone) is active and verified by `test/phase2_api_security.test.ts` (9/9 passing). |

---

## 3. Verdict on OTP Rate Limiting

- **Status:** **PASS (Production-Ready for Single-Node VPS)**
- Both burst abuse and daily SMS-pumping vectors are bounded, and the daily cap survives application restarts via PostgreSQL persistence.
