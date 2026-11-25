# 20 — Final Engineering Verdict

## Answers to the 25 Engineering Assessment Questions

1. **What is the actual purpose of this project?**  
   A Persian-first (RTL) online booking, 20% deposit checkout, customer tracking, and salon CRM/scheduling platform for **Koroush Barber (آرایشگاه کوروش)** in Tehran.
2. **How does the complete system work?**  
   Next.js 14 App Router serves the public booking desk, tracking/receipt pages, customer portal, and admin scheduler. Booking availability generates 13 hourly slots (`10:00–22:00` `Asia/Tehran`), places a 10-minute `SlotHold` + `HELD` appointment, initiates ZarinPal/Mock payment, idempotently confirms via `/api/booking/callback` (with `PAYMENT_REVIEW` reconciliation on race conditions), and dispatches Kavenegar/Mock SMS.
3. **Is the current architecture appropriate?**  
   Yes, a monolithic Next.js + PostgreSQL 16 + Nginx architecture is ideal for a single-salon workload, provided legacy unauthenticated routes are removed/secured and external SMS I/O is moved outside DB transactions.
4. **What are the strongest aspects of the project?**  
   Idempotent payment callback + `PAYMENT_REVIEW` reconciliation (`lib/booking-engine.ts`), self-contained Jalali/Tehran math (`lib/jalali.ts`), production Docker/Nginx isolation (`compose.production.yml`), self-hosted Estedad/Vazirmatn typography, and 0px responsive overflow across 320–1920px.
5. **What are the weakest aspects of the project?**  
   Access control gaps on legacy REST APIs (`SEC-002`) and customer cookies (`SEC-001`), demo credentials visible on `/admin-login` (`SEC-004`), hardcoded fallback secret (`SEC-003`), and missing network timeouts (`REL-001`).
6. **What are the most serious confirmed bugs?**  
   `BUG-001` (`pay/route.ts` ignores percentage deposits), `BUG-002` (admin reschedule logs fake `SENT` SMS without sending), `BUG-004` (SMS HTTP call inside DB transaction), `BUG-006` (infinite spinner on unauthenticated `/dashboard`).
7. **What are the most significant security risks?**  
   `SEC-001` (unsigned `customer_auth` cookie takeover), `SEC-002` (unauthenticated `/api/appointments*`, `/barbers*`, `/services*` PII dump & price tampering), `SEC-003` (hardcoded fallback JWT secret), `SEC-004` (demo credentials on login UI), `SEC-005` (SMS pumping on `/api/booking/otp/send`).
8. **What are the major performance bottlenecks?**  
   External SMS `fetch()` holding DB transaction locks (`BUG-004`), missing `AbortSignal.timeout` on gateway calls (`REL-001`), and sequential `updateMany` loops in `releaseExpiredHolds()`.
9. **What could cause the application to crash?**  
   Non-JSON 502/503 HTML responses from ZarinPal throwing unhandled `SyntaxError` (`REL-001`); slow Kavenegar API causing Prisma interactive transaction timeouts (`BUG-004`).
10. **What could cause data loss or corruption?**  
    Concurrent slot holds in PostgreSQL `ReadCommitted` without partial unique indexes (`BUG-003`); unauthenticated `DELETE /api/appointments/[id]` or `DELETE /api/services/[id]` (`SEC-002`); fake `SENT` SMS records (`BUG-002`).
11. **Which components are incomplete?**  
    Automated SMS reminders/birthday cron runner (`BUG-008`), `WorkingHour` integration in `getAvailabilityForDate()` (`BUG-009`), ESLint config (`OPS-001`), and Customer Portal session/redirect flow (`SEC-001`, `BUG-006`, `BUG-007`).
12. **Which components require refactoring?**  
    Legacy API routes (`app/api/appointments/*`, `barbers/*`, `services/*`), `app/api/booking/pay/route.ts`, `lib/booking-engine.ts` (`handlePaymentCallback` & `reserveSlotHold`), and oversized client files (`BookingStudio.tsx`, `admin/page.tsx`, `admin/sms/page.tsx`).
13. **Which components should remain unchanged?**  
    `lib/jalali.ts`, `lib/admin-auth.ts`, `compose.production.yml`, `Dockerfile`, `scripts/backup-postgres.sh`, self-hosted font architecture (`app/layout.tsx`, `app/globals.css`), and `test/acceptance.test.ts`.
14. **Which technologies or dependencies should be replaced?**  
    No framework/ORM replacement needed; upgrade `next@14.2.15` to the latest patched 14.2.x release and remove duplicate `BookingWizard.tsx` + `.bak` file.
15. **Can the project operate continuously and reliably?**  
    Container/DB restart & backup scripts are solid, but gateway timeouts (`REL-001`) and DB tx SMS calls (`BUG-004`) must be fixed for reliable live ZarinPal/Kavenegar operation.
16. **Can the project handle increasing workloads?**  
    Easily handles single-salon traffic (`10:00–23:00`); multi-instance horizontal scaling would require Redis for rate limiting (`PERF-001`).
17. **Is the project ready for production?**  
    **No** — not in its current state.
18. **What prevents it from being production-ready?**  
    `SEC-001`, `SEC-002`, `SEC-003`, `SEC-004`, `SEC-005`, `BUG-001`, `BUG-002`, `BUG-003`, `BUG-004`, `REL-001`.
19. **What improvements would produce the greatest benefit?**  
    Securing/removing unauthenticated legacy APIs, signing `customer_auth` cookies, hiding demo admin credentials in production, decoupling SMS from DB transactions, and adding fetch timeouts.
20. **What is the recommended order of implementation?**  
    Follow [19_REMEDIATION_ROADMAP.md](./19_REMEDIATION_ROADMAP.md): Phase A (Critical Security) -> Phase B (High Booking/Gateway Reliability) -> Phase C (Nginx/UX/ESLint) -> Phase D (Cron/Refactor).
21. **What should be tested before releasing a new version?**  
    API authorization tests (asserting `401` on all unauthenticated mutations/PII endpoints), PostgreSQL concurrent `reserveSlotHold` race test, percentage deposit `/pay` test, ZarinPal sandbox & Kavenegar timeout tests, plus existing `test:acceptance` and `test:db`.
22. **What uncertainties remain?**  
    Live ZarinPal production API and live Kavenegar API behavior were not exercised because credentials are unset and external network calls were prohibited; PostgreSQL `ReadCommitted` race (`BUG-003`) is inferred from static analysis (local tests ran on SQLite `dev.db`).
23. **What should the ideal future architecture look like?**  
    Keep Next.js + PostgreSQL monolith, add a lightweight scheduled worker/cron for SMS reminders/birthdays, enforce DB partial unique indexes on active holds/confirmed slots, and front with hardened Nginx rate-limiting + structured JSON logging.
24. **What additional features would meaningfully improve the project?**  
    Automated reminder/birthday cron worker (`BUG-008`), `PAYMENT_REVIEW` admin SMS/email alert, and automated off-site backup sync (S3/object storage).
25. **What is your final technical assessment?**  
    The core booking engine, Jalali math, UI/UX, and Docker/Nginx deployment scripts are well-engineered, **but critical access-control oversights (`SEC-001`, `SEC-002`) and booking/gateway edge cases (`BUG-001`–`BUG-004`, `REL-001`) make it unsafe for production until remediated.**

---

## Final Readiness Verdict
**Verdict:** **Requires Major Improvements**
