# 01 — Project Inventory

## 1. Primary Purpose
**Koroush Barber (`barberbook`)** is a Persian-first (RTL) barbershop booking, deposit checkout, and salon CRM platform built for **آرایشگاه کوروش** in Tehran. It enables customers to book fixed 60-minute grooming slots (`10:00–23:00`) using the Jalali calendar, pay a 20% deposit via ZarinPal (or Mock gateway), track/cancel appointments, and submit moderated reviews—while giving salon owners/staff a weekly scheduler, 13-slot daily timeline, CRM directory, birthday tracker, SMS center, and financial ledger.

## 2. Technology Stack
- **Languages:** TypeScript 5.6.3, JavaScript (ESM/CJS scripts), SQL (PostgreSQL / SQLite), Bash
- **Framework:** Next.js 14.2.15 (App Router, `output: "standalone"`), React 18.3.1
- **Database & ORM:** Prisma 5.21.1 (`prisma/schema.prisma` targets PostgreSQL; local `.env` overrides for SQLite `dev.db` during dev/tests)
- **Styling & UI:** Tailwind CSS 3.4.14, Radix UI primitives, Lucide React icons, Framer Motion, Recharts, self-hosted `Estedad` + `Vazirmatn` WOFF2 fonts
- **Validation & Security:** Zod 3.23.8, `bcryptjs` 3.0.3, Node `crypto` & Web Crypto HMAC-SHA256
- **Testing:** `ts-node` (`acceptance.test.ts`, `database_isolation.test.ts`), Playwright 1.65.1 E2E scripts
- **Infrastructure:** Docker multi-stage Alpine build, Docker Compose (`postgres:16-alpine` + `app`), Nginx reverse proxy + Certbot

## 3. Workspace File Summary
- **Total Discovered Files (excluding `.git`, `.next`, `node_modules`, `.claude`):** 356
- **Excluded Directories:** `node_modules/`, `.next/`, `.git/`, `.claude/`

## 4. Component Inventory

| Component | Location | Technology | Responsibility | Dependencies | Status |
|---|---|---|---|---|---|
| Public Home & Booking Studio | `app/page.tsx`, `components/home/*` | React, Framer Motion, Tailwind | Hero, before/after slider, 6-step booking flow, gallery, FAQ, reviews | `/api/booking/*`, `/api/reviews` | Implemented |
| Booking Tracking & Receipt | `app/(booking)/booking/status/page.tsx`, `success/page.tsx` | Next.js Client Pages | Tracking code / OTP lookup, `.ics` download, 12h cancellation, digital receipt | `/api/booking/status`, `cancel`, `otp/*` | Implemented |
| Customer Portal | `app/(customer)/*`, `app/api/customer/*` | Next.js App Router, Prisma | Customer login/register, profile, appointments, notifications | `customer_auth` cookie, Prisma | **Broken/Insecure** (`SEC-001`, `BUG-006`, `BUG-007`) |
| Admin Dashboard & Scheduler | `app/(admin)/admin/page.tsx`, `/api/admin/dashboard` | Next.js, Prisma, Jalali | Weekly 7-day strip, 13-slot timeline, manual booking, reschedule, KPIs | `authorizeAdmin()`, `booking-engine` | Implemented (`BUG-002` on reschedule SMS) |
| Admin CRM, Birthdays, SMS | `app/(admin)/admin/customers`, `birthdays`, `sms` | Next.js, Prisma | Customer profiles, Jalali birthday month filter, SMS templates & manual send | `/api/admin/*`, `lib/providers/sms.ts` | Partially Implemented (`BUG-008` no auto cron) |
| Admin Availability & Settings | `app/(admin)/admin/availability`, `services`, `payments`, `reviews`, `settings` | Next.js, Prisma | Blocked intervals, day closures, service catalog, payment ledger, moderation | `/api/admin/*`, `OWNER` RBAC | Implemented (`BUG-009` `WorkingHour` unused) |
| Booking Engine | `lib/booking-engine.ts` | TypeScript, Prisma | Slot generation, expired hold release, atomic hold, payment callback reconciliation | `prisma`, `jalali`, `payment`, `sms` | Implemented (`BUG-003`, `BUG-004`) |
| Auth & Edge Middleware | `lib/auth.ts`, `lib/edge-auth.ts`, `lib/admin-auth.ts`, `middleware.ts` | HMAC-SHA256, `bcryptjs` | Admin token signing/verification, RBAC (`OWNER`/`STAFF`), `/admin/*` route guard | `ADMIN_JWT_SECRET` | Implemented (`SEC-003`, `SEC-006`) |
| Payment Gateway Adapter | `lib/providers/payment.ts`, `app/payment/mock/[authority]/page.tsx` | Fetch API | ZarinPal v4 (`request`/`verify`) & Mock gateway | `ZARINPAL_MERCHANT_ID` | Implemented (`REL-001`, `SEC-008`) |
| SMS Provider Adapter | `lib/providers/sms.ts` | Fetch API | Kavenegar REST (`lookup`/`send`) & Mock SMS store, phone normalization | `KAVENEGAR_API_KEY` | Implemented (`REL-001`, `PERF-001`) |
| Legacy REST APIs | `app/api/appointments/*`, `barbers/*`, `services/*` | Next.js Route Handlers | Legacy CRUD endpoints | `prisma` | **Critical Risk** (`SEC-002` unauthenticated) |
| Jalali & ICS Utilities | `lib/jalali.ts`, `lib/ics.ts`, `lib/rate-limit.ts` | TypeScript | Jalali math, `Asia/Tehran` conversion, `.ics` export, in-memory rate limit | None | Implemented (`PERF-001`, `BUG-010`) |
| Deployment & Ops | `Dockerfile`, `compose.production.yml`, `deploy/nginx/*`, `scripts/*.sh` | Docker, Nginx, Bash | Multi-stage standalone image, Postgres isolation, SSL Nginx, pg_dump backup | Ubuntu 24.04, Certbot | Implemented (`SEC-009`, `SEC-010`) |
| Automated Tests | `test/*.ts`, `test/*.js` | `ts-node`, Playwright | Acceptance suite (32), DB isolation (22), responsive & admin E2E | Local dev server + `dev.db` | Implemented |
