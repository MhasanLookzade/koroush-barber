# Phase 2 — OTP Security Report

## Multi-Layer OTP Protection (`app/api/booking/otp/send/route.ts` + `lib/rate-limit.ts` + `deploy/nginx/koroushbarber.conf`)
1. **Anti-Spoof IP Extraction (`lib/rate-limit.ts`):** `getClientIp()` prioritizes `x-real-ip` (set directly by Nginx from `$remote_addr`) and falls back to the rightmost `x-forwarded-for` entry rather than the client-spoofable leftmost value.
2. **Nginx Edge Rate Limit:** `limit_req_zone ... zone=auth_otp_limit:10m rate=10r/m;` applied to `/api/(booking/otp/|admin/auth/|auth/)`.
3. **IP Burst Limit:** Max **5** OTP sends per IP per 10 minutes (`429`).
4. **Phone Burst Limit:** Max **3** OTP sends per normalized phone per 15 minutes (`429`).
5. **Persistent Daily Phone Cap:** Max **8** `OtpChallenge` records per phone per 24 hours (`429`, backed by DB count).
6. **Resend Cooldown:** Existing 2-minute unverified challenge cooldown preserved (`429`), plus existing 5-attempt max verification lockout in `/api/booking/otp/verify`.
