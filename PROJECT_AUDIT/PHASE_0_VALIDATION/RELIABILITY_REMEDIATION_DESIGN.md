# Phase 0 — Reliability Remediation Design

## 1. `BUG-004` — Decouple External SMS HTTP Calls from Prisma Transactions
- **Original Behavior:** `handlePaymentCallback()` (`lib/booking-engine.ts:544-684`) executes `await sms.sendBookingConfirmation(...)` inside `prisma.$transaction(async (tx) => ...)`.
- **Problem & Root Cause:** Placing external network I/O inside an ACID transaction holds database locks and risks exceeding Prisma's default 5s interactive transaction timeout if Kavenegar is slow, rolling back a bank-verified appointment confirmation.
- **Proposed Behavior:**
  1. Inside `prisma.$transaction(async (tx) => ...)`: perform **only** DB reads/writes (`conflictingConfirmed`, `appointment.update`, `payment.update`, `slotHold.updateMany`, `auditLog.create`). Return `{ success: true, isIdempotentRepeat: false, appointment: updatedApp, shouldSendSms: true }` (or `false` if `PAYMENT_REVIEW`).
  2. **After** `prisma.$transaction` commits successfully, check if a `NotificationJob` with `type: "CONFIRMATION"` containing `updatedApp.trackingCode` already exists (idempotency). If not, call `await sms.sendBookingConfirmation(...)` and insert `prisma.notificationJob` with the actual `SENT`/`FAILED` status.
  3. Wrap post-commit SMS dispatch in `try/catch` so an SMS failure logs an error and persists `FAILED` without failing the HTTP callback response or rolling back the confirmed booking.

## 2. `REL-001` — HTTP Timeouts, Status Validation, and Safe JSON Parsing
- **Original Behavior:**
  - `ZarinPalPaymentGatewayImpl.initiatePayment` & `verifyPayment` (`lib/providers/payment.ts:151-196`) call `fetch(...)` with no timeout and immediately call `await res.json()`.
  - `KavenegarSmsProviderImpl` (`lib/providers/sms.ts:166-258`) calls `fetch(...)` with no timeout and calls `await response.json()` without checking `response.ok` or content-type. Also `sendOtp` interpolates `receptor`, `token`, `template` directly into query string without `encodeURIComponent`.
- **Proposed Behavior:**
  - Add a shared helper `fetchJsonWithTimeout(url, options, timeoutMs = 10000)` in both providers (or `lib/http.ts`) using `AbortSignal.timeout(timeoutMs)` (supported natively in Node 20+).
  - Check `res.ok` and parse `const rawText = await res.text()` followed by safe `JSON.parse(rawText)` in `try/catch`, returning structured error details (without leaking API keys in error messages) if the gateway returns HTML 502/503 or times out.
  - Use `URLSearchParams` for `KavenegarSmsProviderImpl.sendOtp` query parameters so special characters are properly encoded.

## 3. Duplicate Requests & Partial Failure Handling
- **Payment Callback Idempotency:** Preserved cleanly — `payment.status === "VERIFIED"` check remains at entry, and `NotificationJob` trackingCode check prevents duplicate confirmation SMS on concurrent/repeated callbacks.
- **Gateway Timeout on `/verify.json`:** If `verifyPayment` throws/times out, payment stays `PENDING` (do **not** mark `CANCELLED` on transient network timeout — only mark `FAILED`/`CANCELLED` when ZarinPal explicitly returns a rejection code or `Status=NOK`!). That way a customer retrying the callback URL can still verify and confirm!
