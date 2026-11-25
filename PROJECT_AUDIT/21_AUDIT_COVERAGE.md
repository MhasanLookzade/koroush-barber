# 21 — Audit Coverage & Methodology

- **Total Discovered Workspace Files:** 356 (excluding `node_modules/`, `.next/`, `.git/`, `.claude/`)
- **Core Code & Config Files Reviewed in Depth:**
  - Root configs: `package.json`, `next.config.js`, `middleware.ts`, `Dockerfile`, `docker-compose.yml`, `compose.production.yml`, `docker-entrypoint.sh`, `.env.production.example`, `deploy/nginx/koroushbarber.conf`
  - Database & Seed: `prisma/schema.prisma`, `prisma/migrations/20261124000000_init/migration.sql`, `scripts/seed-production.js`, `scripts/backup-postgres.sh`, `scripts/health-check.sh`
  - Domain Libraries (`lib/`): `db.ts`, `auth.ts`, `edge-auth.ts`, `admin-auth.ts`, `booking-engine.ts`, `jalali.ts`, `ics.ts`, `rate-limit.ts`, `utils.ts`, `providers/payment.ts`, `providers/sms.ts`
  - API Routes (`app/api/`): All 35+ route handlers audited (auth checks verified programmatically across all `/api/admin/*` routes and manually across `/api/booking/*`, `/api/customer/*`, `/api/auth/*`, `/api/appointments/*`, `/api/barbers/*`, `/api/services/*`, `/api/reviews`, `/api/health`)
  - Frontend & Layouts: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/admin-login/page.tsx`, `app/payment/mock/[authority]/page.tsx`, `app/(customer)/layout.tsx`, `components/home/*`, `components/shared/*`, `components/admin/*`
- **Excluded Directories:** `node_modules/`, `.next/`, `.git/`, `.claude/` (third-party/build caches).
- **Analysis Limitations:**
  - Live ZarinPal and Kavenegar production integrations could not be exercised without production API keys and external network calls.
  - Concurrency behavior in `lib/booking-engine.ts` (`BUG-003`) was evaluated via static analysis for PostgreSQL (`ReadCommitted`), while automated tests ran against local SQLite `dev.db`.
