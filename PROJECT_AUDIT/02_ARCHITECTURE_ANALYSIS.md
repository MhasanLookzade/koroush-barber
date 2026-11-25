# 02 — Architecture Analysis

## 1. Overall System Architecture
Koroush Barber is a **monolithic Next.js 14 full-stack application** using the App Router with server-rendered/dynamic API route handlers backed by Prisma ORM.

```mermaid
flowchart TB
    Client["Customer / Admin Browser (RTL)"] -->|"HTTPS :443"| Nginx["Nginx Reverse Proxy\n(deploy/nginx/koroushbarber.conf)"]
    Nginx -->|"HTTP 127.0.0.1:3000"| MW["Next.js Middleware\n(middleware.ts -> edge-auth.ts)"]
    MW -->|"/admin/* guard"| AdminUI["Admin Dashboard Pages\napp/(admin)/admin/*"]
    MW -->|"Public / Customer"| PublicUI["Public & Customer Pages\napp/(booking)/*, app/(customer)/*"]
    AdminUI -->|"JSON + admin_token cookie"| AdminAPI["Admin API Routes\napp/api/admin/*"]
    PublicUI -->|"JSON"| BookingAPI["Booking API Routes\napp/api/booking/*"]
    PublicUI -->|"JSON + customer_auth cookie"| CustAPI["Customer API Routes\napp/api/customer/*"]
    PublicUI -->|"Unauthenticated Legacy"| LegacyAPI["Legacy CRUD APIs\n/api/appointments, /barbers, /services"]
    AdminAPI --> Engine["Booking Engine & Providers\nlib/booking-engine.ts, payment.ts, sms.ts"]
    BookingAPI --> Engine
    Engine -->|"Prisma Client"| DB[("PostgreSQL 16 (Prod)\nSQLite dev.db (Dev)")]
    Engine -->|"HTTPS"| ZarinPal["ZarinPal IPG v4"]
    Engine -->|"HTTPS"| Kavenegar["Kavenegar SMS API"]
```

## 2. Component Dependency Graph
```mermaid
flowchart LR
    MW["middleware.ts"] --> EdgeAuth["lib/edge-auth.ts"]
    AdminAPI["app/api/admin/*"] --> AdminAuth["lib/admin-auth.ts"] --> Auth["lib/auth.ts"]
    AdminAPI --> Engine["lib/booking-engine.ts"]
    BookingAPI["app/api/booking/*"] --> Engine
    BookingAPI --> RateLimit["lib/rate-limit.ts"]
    Engine --> DB["lib/db.ts"]
    Engine --> Jalali["lib/jalali.ts"]
    Engine --> Payment["lib/providers/payment.ts"]
    Engine --> SMS["lib/providers/sms.ts"]
    Engine --> Auth
```

## 3. End-to-End Booking & Payment Data Flow
```mermaid
sequenceDiagram
    participant U as Customer Browser
    participant API as /api/booking/*
    participant BE as lib/booking-engine.ts
    participant DB as PostgreSQL/SQLite
    participant GW as ZarinPal / Mock Gateway
    participant SMS as Kavenegar / Mock SMS

    U->>API: GET /api/booking/availability?date=YYYY-MM-DD
    API->>BE: getAvailabilityForDate()
    BE->>DB: releaseExpiredHolds() + query Override, Blocked, Appointments, Holds
    BE-->>U: 13 slots (10:00..22:00) with status

    U->>API: POST /api/booking/hold
    API->>BE: reserveSlotHold()
    BE->>DB: $transaction -> create SlotHold (10m) + Appointment (HELD)
    BE-->>U: appointmentId, trackingCode (KB-xxxxx)

    U->>API: POST /api/booking/pay
    API->>GW: initiatePayment(depositAmount)
    API->>DB: Create Payment (PENDING), Appointment -> AWAITING_PAYMENT
    API-->>U: redirectUrl

    U->>GW: Complete Payment
    GW->>API: GET /api/booking/callback?Authority=...&Status=OK
    API->>BE: handlePaymentCallback()
    BE->>GW: verifyPayment()
    BE->>DB: $transaction -> CONFIRMED + Payment VERIFIED + Hold CONVERTED
    BE->>SMS: sendBookingConfirmation() (inside tx!)
    API-->>U: Redirect /booking/success?trackingCode=...
```

## 4. Application Startup & Deployment Architecture
```mermaid
flowchart LR
    Entry["docker-entrypoint.sh"] -->|"1"| Migrate["prisma migrate deploy"]
    Migrate -->|"2"| Seed["node scripts/seed-production.js\n(Idempotent baseline + initial admin)"]
    Seed -->|"3"| Server["exec node server.js (:3000)"]
```

```mermaid
flowchart TB
    Internet(("Internet")) -->|":80 / :443 TLS"| HostNginx["Host Nginx + Certbot"]
    HostNginx -->|"127.0.0.1:3000"| AppContainer["Docker: koroush-app\n(nextjs non-root, 1.5GB limit)"]
    AppContainer -->|"koroush-internal bridge\n(not exposed to host)"| PGContainer["Docker: koroush-postgres\n(postgres:16-alpine, 1GB limit)"]
    PGContainer --> Vol[("koroush_pg_data")]
```

## 5. Architectural Findings
- **Inconsistent Auth Boundary:** `middleware.ts` only matches `/admin/:path*`, relying on route handlers for API auth. While `/api/admin/*` consistently calls `authorizeAdmin()`, legacy routes (`/api/appointments*`, `/api/barbers*`, `/api/services*`) have no auth at all (`SEC-002`), and `/api/customer/*` uses an unsigned ID cookie (`SEC-001`).
- **Domain Logic Leakage & Duplication:** Deposit calculation (`pay/route.ts` vs `booking-engine.ts`) and cancellation logic (`/api/booking/cancel` vs `/api/customer/appointments/[id]`) are duplicated with divergent business rules (`BUG-001`, `BUG-007`).
- **Transaction Boundary Violation:** `handlePaymentCallback()` runs an external HTTP SMS call inside `prisma.$transaction()` (`BUG-004`).
- **Single Points of Failure:** Single Node.js container (`127.0.0.1:3000`), single PostgreSQL instance, process-local `rateLimitStore` (`PERF-001`), and missing background worker for scheduled reminders/birthdays (`BUG-008`).
