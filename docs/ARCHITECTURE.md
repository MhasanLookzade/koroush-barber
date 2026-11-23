# Koroush Barber — System Architecture (معماری سیستم)
**Application:** Koroush Barber Full-Stack Booking Platform  
**Target Environment:** Standard Linux VPS (Iran accessible) + Docker Compose  
**Language/Runtime:** TypeScript, Node.js 20 LTS, Next.js 14 App Router  
**ORM:** Prisma with interactive ACID transactions  

---

## 1. System Topology & Technology Stack

```
+-------------------------------------------------------------------------+
|                              Client Layer                               |
|   Next.js 14 App Router (RTL, fa-IR, Responsive 360px - 1440px)        |
|   Tailwind CSS + shadcn/Radix Primitives + Lucide SVG Icons             |
+------------------------------------+------------------------------------+
                                     | (HTTPS / REST API)
+------------------------------------v------------------------------------+
|                           Application Server                            |
|  - Booking Engine & Availability Calculator (Asia/Tehran Zone)         |
|  - Concurrency Controller & Atomic Slot Hold Manager                   |
|  - Payment Gateway Adapter Layer (Mock + ZarinPal)                      |
|  - SMS / OTP Provider Layer (Mock + Kavenegar)                          |
|  - Admin RBAC & Audit Logger (OWNER / STAFF)                            |
+------------------------------------+------------------------------------+
                                     | (Prisma ORM / ACID Transactions)
+------------------------------------v------------------------------------+
|                             Data Layer                                  |
|   Production: PostgreSQL 16 (in Docker)                                 |
|   Development / CI: SQLite file-backed (Zero external setup friction)   |
+-------------------------------------------------------------------------+
```

---

## 2. Database Schema & Entity Relationships (ERD)

### Core Entities
1. **`Salon` / `SiteSetting`:** Salon profile, business hours, cancellation horizon, hold expiry in minutes (default: 10), SMS templates, active payment gateway mode.
2. **`Barber`:** Master barber records (V1: Kourosh Barber), bio, avatar, status.
3. **`Service`:** Service name (FA), description, price (Tomans), deposit amount/percentage, active status, duration (60m).
4. **`WorkingHours` & `ScheduleOverride`:** Daily operating windows (10:00 - 23:00) and date-specific closures, holidays, or break times.
5. **`SlotHold`:** Atomic temporary reservation record:
   - `id`, `slotTime` (UTC timestamp), `barberId`, `customerPhone`, `expiresAt`, `status` (`ACTIVE`, `EXPIRED`, `RELEASED`, `CONVERTED`).
6. **`Appointment`:** Confirmed or processing booking:
   - `id`, `trackingCode` (e.g. `KB-84920`), `barberId`, `serviceId`, `customerId`, `startTime`, `endTime`, `totalPrice`, `depositPaid`, `balanceDue`, `status`.
7. **`Payment` & `PaymentEvent`:** Gateway transaction ledger:
   - `id`, `appointmentId`, `authority`, `amountToman`, `amountRial`, `gateway`, `status`, `refId`, `verifiedAt`, `rawCallbackPayload`.
8. **`OtpChallenge`:** Rate-limited OTP challenges:
   - `phone`, `codeHash`, `attempts`, `expiresAt`, `verified`.
9. **`Customer`:** Verified customer profile, phone number, name, lifetime visit tally.
10. **`AuditLog`:** Administrative change ledger (who did what, old values, new values, timestamp).

---

## 3. Booking Engine & Concurrency Control

### Authoritative Time & Slot Generation
- All internal dates are computed and stored as UTC timestamps.
- Time conversions authoritative to `Asia/Tehran` (+03:30 standard time).
- Exactly 13 fixed start times generated daily: `10:00, 11:00, ..., 22:00`.
- The `23:00` slot is never offered as salon doors close at 23:00.

### Atomic Slot Hold Strategy (Double-Booking Prevention)
To eliminate race conditions between concurrent visitors:
1. When a customer confirms service, date, time, and phone, clicking "پرداخت بیعانه" triggers `POST /api/booking/hold`.
2. Inside an interactive ACID transaction (`prisma.$transaction`):
   - Check if an existing confirmed `Appointment` exists for `[barberId, slotTime]`.
   - Check if an active `SlotHold` exists where `expiresAt > NOW()` and `status = 'ACTIVE'`.
   - If either exists, abort transaction and return `409 Conflict` with clear Persian explanation ("این ساعت هم‌اکنون رزرو یا در حال پرداخت است").
   - If free, insert a new `SlotHold` with `expiresAt = NOW() + 10 minutes` and create an `Appointment` in `HELD` status.
3. A background task or on-demand check marks expired holds as `EXPIRED`, returning the slot to public inventory automatically.

### State Transitions

```
[Customer selects slot]
          |
          v
       [ DRAFT ]
          |
    (Initiate Pay -> Atomic Hold created for 10 min)
          v
       [ HELD ] ---------- (Hold expired > 10m) ----------> [ EXPIRED ]
          |
    (Redirect to Gateway)
          v
 [ AWAITING_PAYMENT ]
          |
          +-----------------------+-----------------------+
          | (Payment Verified)    | (Payment Cancelled)   | (Delayed Verify after Slot Taken)
          v                       v                       v
    [ CONFIRMED ]           [ CANCELLED ]         [ PAYMENT_REVIEW ]
          |                                               |
          +-----------------------+                       (Admin Alert Logged)
          |                       |
          v                       v
    [ COMPLETED ]           [ NO_SHOW ]
```

### Payment State Machine
- `CREATED`: Hold acquired, payment record created.
- `PENDING`: Redirected to payment provider.
- `VERIFIED`: Server-to-server verification successful, matching amount and authority.
- `FAILED`: Gateway declined or cancelled by customer.
- `REFUND_PENDING` / `REFUNDED`: Admin-initiated cancellation refund.

---

## 4. Payment Gateway & SMS Provider Architecture

### Payment Gateway Provider Pattern
```typescript
export interface PaymentGatewayProvider {
  name: string;
  initiatePayment(params: {
    amountToman: number;
    callbackUrl: string;
    description: string;
    customerPhone: string;
    bookingReference: string;
  }): Promise<{ authority: string; redirectUrl: string }>;

  verifyPayment(params: {
    authority: string;
    amountToman: number;
  }): Promise<{
    success: boolean;
    refId?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;
}
```
- **`MockPaymentGateway`:** Embedded development and integration test provider. Supports deterministic testing modes (`approved`, `declined`, `expired_hold`, `delayed_race`).
- **`ZarinPalGateway`:** Production adapter conforming to official ZarinPal REST API specification, translating Tomans to Rials reliably.

### Idempotency & Late-Callback Handling
- Repeated callbacks with the same `authority` are checked against existing `Payment` records. If already verified, the response is returned immediately without issuing duplicate SMS or updating states.
- If a late payment callback succeeds but the slot was already re-assigned, the appointment transitions to `PAYMENT_REVIEW`, recording the gateway transaction ID and firing an administrative alert.

### Iranian SMS / OTP Provider Pattern
```typescript
export interface SmsProvider {
  name: string;
  sendOtp(phone: string, code: string): Promise<boolean>;
  sendBookingConfirmation(phone: string, booking: BookingSummary): Promise<boolean>;
  sendReminder(phone: string, booking: BookingSummary): Promise<boolean>;
}
```
- **Phone Normalization:** All inputs (`0912...`, `+98912...`, `0098912...`) normalized to standard `09123456789`.
- **`MockSmsProvider`:** In development, captures codes in memory for immediate automated testing without exposing secrets in console.
- **`KavenegarSmsProvider`:** Production provider leveraging Kavenegar's lookup pattern for low-latency OTP delivery.

---

## 5. Security & Admin RBAC

- **Authentication:** Admin session token with HMAC signature stored in an `httpOnly`, `SameSite=Lax`, `Secure` cookie.
- **Roles:**
  - `OWNER`: Full permissions including financial exports, setting adjustments, staff management, and refund approvals.
  - `STAFF`: Day-to-day calendar management, customer check-in, completion, and manual appointment entry.
- **API Defense:** All `/api/admin/*` routes strictly validate authorization headers and session cookies server-side. Public requests are rejected with `401 Unauthorized`.
- **Audit Logging:** Every administrative override, cancellation, and setting update is logged in the `AuditLog` table with user identification and timestamp.
