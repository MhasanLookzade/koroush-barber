# 00 — Executive Summary

**Project:** Koroush Barber (`barberbook`) — Online Appointment Booking, Deposit Payment, & Salon CRM Platform  
**Audit Date:** 2026-11-25  
**Target Domain:** `koroushbarber.ir`  
**Stack:** Next.js 14.2.15 (App Router, Standalone), React 18.3.1, TypeScript 5.6.3, Prisma 5.21.1, PostgreSQL 16 (prod) / SQLite (local dev), Tailwind CSS 3.4.14, ZarinPal IPG, Kavenegar SMS  
**Overall Readiness Verdict:** **Requires Major Improvements** (Specifically: 2 Critical and 8 High-severity security/correctness issues must be resolved before production launch)

---

## 1. Key Strengths
1. **Atomic Hold & Payment Idempotency Core (`lib/booking-engine.ts`)**: Well-structured slot inventory (13 hourly slots `10:00–22:00`), 10-minute `SlotHold` expiration, idempotent payment callback verification, and automatic `PAYMENT_REVIEW` reconciliation on delayed gateway callbacks.
2. **Self-Contained Jalali & Tehran Timezone Engine (`lib/jalali.ts`)**: Algorithmic Gregorian ↔ Jalali conversion, `Asia/Tehran` UTC boundary handling, and tabular Persian numerals.
3. **Production Deployment Automation (`compose.production.yml`, `deploy/nginx/koroushbarber.conf`, `scripts/deploy-ubuntu.sh`)**: Strong container isolation (Postgres never exposed on WAN, non-root `nextjs` user, memory limits, automated `pg_dump` backup scripts).
4. **Offline-Resilient Persian Typography**: Self-hosted `Estedad` and `Vazirmatn` WOFF2 fonts via `next/font/local` + `@font-face` with zero external CDN dependencies.
5. **Strong Automated Acceptance & Responsive Testing**: 32/32 acceptance tests, 22/22 database isolation tests, 11/11 public viewports, and 40/40 admin route×viewport checks passing with 0px horizontal overflow.

---

## 2. Critical & High-Severity Risks (Immediate Action Required)

| ID | Severity | Summary | File |
|---|---|---|---|
| **SEC-001** | **CRITICAL** | Unsigned `customer_auth` cookie stores raw `customer.id`, allowing full customer account impersonation across `/api/customer/*`. | `app/api/auth/customer/login/route.ts` |
| **SEC-002** | **CRITICAL** | Legacy REST routes (`/api/appointments*`, `/api/barbers*`, `/api/services*`) have **no authentication**, exposing all customer PII and allowing unauthenticated price tampering or record deletion. | `app/api/appointments/route.ts`, `app/api/services/[id]/route.ts` |
| **SEC-003** | **HIGH** | Hardcoded fallback `AUTH_SECRET` (`koroush-barber-luxury-secret-key-2026`) enables admin token forgery if env vars are unset. | `lib/auth.ts`, `lib/edge-auth.ts` |
| **SEC-004** | **HIGH** | `/admin-login` pre-fills and publicly displays `admin/admin123456` and `staff/staff123456` demo buttons without a non-production guard. | `app/admin-login/page.tsx` |
| **SEC-005** | **HIGH** | `POST /api/booking/otp/send` lacks IP rate limiting, enabling SMS pumping attacks against Kavenegar balance. | `app/api/booking/otp/send/route.ts` |
| **BUG-001** | **HIGH** | `POST /api/booking/pay` ignores `depositType === "percentage"` / `depositPercent`, charging `depositPrice \|\| 50000` instead of the held deposit amount. | `app/api/booking/pay/route.ts` |
| **BUG-002** | **HIGH** | Admin appointment reschedule writes fake `SENT` (`SMS_IR`) `NotificationJob` rows without actually calling `getSmsProvider()`. | `app/api/admin/appointments/reschedule/route.ts` |
| **BUG-003** | **HIGH** | `reserveSlotHold()` uses PostgreSQL's default `ReadCommitted` isolation without partial unique indexes, risking concurrent hold race conditions in production. | `lib/booking-engine.ts` |
| **BUG-004** | **HIGH** | External Kavenegar `fetch()` executes inside `prisma.$transaction()` during payment confirmation, risking 5s transaction timeout & rollback of paid bookings. | `lib/booking-engine.ts` |
| **REL-001** | **HIGH** | ZarinPal and Kavenegar `fetch()` calls lack `AbortSignal.timeout` and `res.ok` / non-JSON response guards. | `lib/providers/payment.ts`, `lib/providers/sms.ts` |

---

## 3. Finding Distribution (24 Total)
- **CRITICAL:** 2
- **HIGH:** 8
- **MEDIUM:** 11
- **LOW:** 3
- **INFORMATIONAL:** 0

See [18_PROJECT_SCORECARD.md](./18_PROJECT_SCORECARD.md) for category scores (Overall: **68/100**) and [19_REMEDIATION_ROADMAP.md](./19_REMEDIATION_ROADMAP.md) for the phased fix plan.
