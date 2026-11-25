# 16 — Documentation Review

## 1. Existing Documentation Inspected
- `README.md` (6.4 KB)
- `UBUNTU_PRODUCTION_DEPLOYMENT_FA.md` (29.5 KB) — Comprehensive Persian deployment guide for Ubuntu 24.04 + Nginx + Docker + Postgres + Certbot
- `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/DESIGN_SYSTEM.md`, `docs/DESIGN_SYSTEM_REVIEW.md`, `docs/PRODUCT_PLAN.md`, `docs/TEST_PLAN.md`, `docs/UX_SYSTEM.md`

## 2. Gaps & Inaccuracies Found
1. **Unverified Security Claims vs Reality:** Documentation describes strict RBAC and secure sessions, yet omits the existence of unauthenticated legacy endpoints (`/api/appointments*`, `/api/barbers*`, `/api/services*`) and the unsigned `customer_auth` cookie (`SEC-001`, `SEC-002`).
2. **Domain & Address Drift:** Documentation and configs alternate between `koroushbarber.ir` (`deploy/nginx/koroushbarber.conf`, `app/page.tsx`) and `kouroshbarber.ir` (`app/layout.tsx`, `lib/ics.ts`). Salon street address also differs between `lib/ics.ts` and `app/page.tsx`.
3. **Missing Cron Setup for SMS Reminders:** `UBUNTU_PRODUCTION_DEPLOYMENT_FA.md` documents automated backup cron jobs, but there is no cron or documentation for automated SMS reminders/birthday greetings (`BUG-008`) because the runner does not yet exist.
4. **Missing ESLint Setup Note:** `README.md` / `TEST_PLAN.md` do not reflect that `npm run lint` fails interactively without `.eslintrc.json`.
