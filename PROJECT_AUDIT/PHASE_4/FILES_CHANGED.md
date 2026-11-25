# Phase 4 — Changed Files Inventory

**Branch:** `fix/phase-4-reliability-notifications`  
**Baseline:** `backup/pre-phase-4` (commit `0e95123` on `fix/phase-3.2-final-integrity`)  
**Preserved Backups:** `backup/pre-phase-1` (`ae409d4`), `backup/pre-phase-2` (`edfe2d8`), `backup/pre-phase-3` (`43023c5`), `backup/pre-phase-3.2` (`9a52937`)

---

## New Core Modules & Endpoints

1. [`lib/http.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts) *(new)*
   - Bounded HTTP fetch wrapper `fetchJsonWithTimeout` (`AbortSignal.timeout`), safe raw-text/JSON parsing, failure category classification (`TIMEOUT`, `NETWORK_ERROR`, `HTTP_429`, `HTTP_4XX`, `HTTP_5XX`, `INVALID_JSON`, `PROVIDER_ERROR`, `CONFIG_ERROR`), structured correlation telemetry, and `sanitizeTelemetryText()` masking API keys, OTP tokens, and Bearer secrets.

2. [`lib/notifications.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts) *(new)*
   - PostgreSQL/SQLite transactional outbox (`enqueueNotificationJob`, `processNotificationJob`, `recoverStuckSendingJobs`, `processDueNotificationJobs`, `runScheduledNotificationCycle`, `drainInFlightNotifications`) with atomic optimistic claiming, bounded exponential backoff (`30s` base, `maxAttempts=3`), explicit status progression (`QUEUED` -> `SENDING` -> `SENT` | `RETRY_PENDING` -> `FAILED` | `UNKNOWN`), and automated reminder/birthday enqueueing (`BUG-008`).

3. [`app/api/cron/notifications/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/cron/notifications/route.ts) *(new)*
   - Timing-safe `CRON_SECRET` Bearer or admin-authenticated endpoint triggering `runScheduledNotificationCycle()` (`BUG-008`).

---

## Modified Source Files

4. [`lib/providers/payment.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/payment.ts)
   - Hardened `ZarinPalPaymentGateway` (`initiatePayment` and `verifyPayment`) using `fetchJsonWithTimeout`, non-retrying initiation, explicit `isUncertain` separation between definitive bank rejection vs network/5xx/timeout, and correlation telemetry (`REL-001`).

5. [`lib/providers/sms.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/sms.ts)
   - Hardened `KavenegarSmsProvider` (`sendOtp`, `sendBookingConfirmation`, `sendReminder`, `sendBirthdayGreeting`, `sendCustomSms`) via shared `executeSendSms` + `evaluateResponse`, `URLSearchParams` OTP query encoding, bounded timeout, JSON/HTTP guards, retryability classification, provider acceptance notes, and sanitized telemetry (`REL-001`).
   - Added deterministic failure simulation queue (`MockSmsProvider.nextFailures`) for testing.

6. [`lib/booking-engine.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts)
   - Updated `handlePaymentCallback()` to keep `Payment = PENDING` on `isUncertain` ZarinPal verification errors, enqueue confirmation `NotificationJob` inside the confirmation transaction (`QUEUED`), and dispatch via `processNotificationJob` strictly after commit (`BUG-004`).

7. [`app/api/admin/appointments/reschedule/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/appointments/reschedule/route.ts)
   - Removed placeholder `status: "SENT", provider: "SMS_IR"` write; now enqueues `"QUEUED"` inside reschedule transaction and dispatches via `processNotificationJob()` after transaction commit (`BUG-002`, `BUG-004`).

8. [`app/api/admin/sms/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/sms/route.ts)
   - Routed custom SMS & retry actions through `enqueueNotificationJob` + `processNotificationJob`, updated pending/failed stat buckets for new outbox statuses, and added `process_outbox` / `run_automations` actions (`BUG-008`).

9. [`app/api/admin/birthdays/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/birthdays/route.ts)
   - Routed birthday SMS dispatch through `enqueueNotificationJob` + `processNotificationJob` and excluded failed jobs from 30-day duplicate suppression.

10. [`app/api/booking/otp/send/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/booking/otp/send/route.ts)
    - Validates `sms.sendOtp()` delivery result and returns `503` if SMS delivery fails instead of falsely reporting success.

---

## New Test Suite

11. [`test/phase4_reliability_notifications.test.ts`](file:///c:/Users/blue/Documents/projects/barber/test/phase4_reliability_notifications.test.ts)
    - 25-assertion reliability, gateway failure, outbox recovery, reschedule, rollback, and cron suite.
