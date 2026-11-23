# Koroush Barber | آرایشگاه کوروش

<p align="center">
  <strong>استایل حرفه‌ای، دقیقاً سر وقت شما.</strong><br>
  <em>A luxury men's grooming appointment & scheduling platform tailored for customers in Iran.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/Acceptance%20Tests-25%2F25%20Passing-success?style=flat-square" alt="Tests">
</p>

---

## 🌟 Key Features

### 💈 Customer Experience (fa-IR & RTL)
- **100% Persian & RTL Native**: Editorial Minimal Luxury design (`#0D0F0E` obsidian, `#C8A96B` bronze/gold, `#F5F1E8` ivory) with WCAG 2.2 AA accessibility and 44px+ tap targets.
- **Bijective Jalali (Shamsi) Calendar**: Native conversion algorithm anchored to `Asia/Tehran` with UTC persistence.
- **Distraction-Free 60-Second Booking**: 4-step wizard (`/booking`) covering Service selection, Date/Time slot picker, Iranian Mobile verification, and Deposit summary.
- **Strict 60-Minute Slot Invariants**: 10:00 to 23:00 operating window producing 13 daily start slots (`10:00, ..., 22:00`); closing time `23:00` is never offered as a start time.
- **Transparent Integer Accounting**: Pricing in Tomans (تومان) with transparent deposit breakdown and remaining in-salon balance.
- **Self-Service Customer Portal**: Lookup appointments, download RFC 5545 `.ics` calendar invites, or request cancellations within the salon policy deadline at `/booking/status`.

### 🛡️ Core Engine & Security
- **Atomic Concurrency Locking**: Database transaction hold locking (`SlotHold`) for 10 minutes during payment checkout to prevent race condition double-booking.
- **Gateway Idempotency & Reconciliation**: Delayed or duplicate gateway callbacks are handled idempotently. Late payments on reallocated slots transition to `PAYMENT_REVIEW` with admin audit logging rather than double-booking.
- **Pluggable Iranian Provider Architecture**:
  - **Payment Gateways**: Mock sandbox terminal with simulation controls (`/payment/mock/[authority]`) for zero-cost local testing, and official **ZarinPal** adapter (with Tomans to Rials `x10` conversion).
  - **SMS Gateways**: In-memory mock SMS provider and official **Kavenegar** adapter supporting fast-delivery OTP lookup templates (`koroush-verify`).
- **Secure Management Suite (`/admin/*`)**: Edge middleware authentication, role-based access control (`OWNER` vs `STAFF`), search engine blocking (`X-Robots-Tag: noindex`), manual walk-in booking, calendar slot blocking, and CSV payment exports.

---

## 🏗️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Standalone Output)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Lucide Icons
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) supporting PostgreSQL 16 (production) and SQLite (development)
- **Calendar & Time**: Custom self-contained Jalali algorithmic library anchored to `Asia/Tehran`
- **Containerization**: Multi-stage Docker build with Docker Compose

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20+
- npm 10+
- Git

### 2. Installation & Setup
```bash
# Clone repository
git clone https://github.com/MhasanLookzade/koroush-barber.git
cd koroush-barber

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Initialize database schema & seed demo data
npx prisma db push
npm run db:seed
```

### 3. Launch Development Server
```bash
npm run dev
```

Visit the application:
- **Public Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Customer Booking Flow**: [http://localhost:3000/booking](http://localhost:3000/booking)
- **Appointment Status**: [http://localhost:3000/booking/status](http://localhost:3000/booking/status)
- **Admin Management**: [http://localhost:3000/admin-login](http://localhost:3000/admin-login)
  - Default Owner: `admin` / `admin123456`
  - Default Staff: `staff` / `staff123456`

---

## 🧪 Automated Acceptance Testing

Run the full automated test suite verifying all 15 business scenarios:

```bash
npm run test:acceptance
```

All 25 assertions execute locally with zero external API dependencies or mock credentials:
1. Blank Day 13-Slot Inventory Verification
2. Unconfirmed State Prior to Payment
3. Server-Verified Payment Transitions to CONFIRMED
4. Abandoned / Expired Payment Releases Slot
5. Database-Level Atomic Collision Prevention
6. Idempotent Payment Callback Processing
7. Delayed Callback Reallocation (`PAYMENT_REVIEW`)
8. Admin Blocked Interval Slot Enforcement
9. Salon Cancellation Cutoff Window (12h)
10. Integer Tomans Arithmetic & Separation
11. Page Refresh & Interrupted Flow State Resilience
12. Gregorian <-> Jalali Bijective Algorithmic Match
13. Iranian Mobile Number Normalization (`09xxxxxxxxx`)
14. Admin JWT Cryptographic Signature & RBAC
15. Zero-Secret Local Execution

---

## 🐳 Docker Deployment

To launch the application with PostgreSQL in production:

```bash
docker compose up -d --build
```

Automated database backups can be taken via:
```bash
./scripts/backup-db.sh
```

---

## 📚 Architectural Documentation

Comprehensive engineering documents are located in the `docs/` directory:
- [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md) — Product roadmap, pricing structure, and cancellation policies.
- [docs/UX_SYSTEM.md](docs/UX_SYSTEM.md) — Design system tokens, color palettes, and accessibility guidelines.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Database schema, state machine diagrams, and concurrency architecture.
- [docs/TEST_PLAN.md](docs/TEST_PLAN.md) — Acceptance test matrix and regression scenarios.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Linux VPS setup, Caddy/Nginx reverse proxy, and Iranian gateway provisioning.

---

## 📄 License

This project is licensed under the MIT License.
