# Cron & Notification Deduplication Report (`CRN-41-01`)

## 1. Root Cause in Phase 4.1

[`runScheduledNotificationCycle()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L508-L612) previously checked for existing reminder or birthday rows via application-level `findFirst({ where: { message: { contains: ... } } })` followed by `NotificationJob.create()`. Under concurrent `/api/cron/notifications` executions, two transactions both observed `existing = null` and inserted duplicate `"REMINDER"` / `"BIRTHDAY"` rows and delivered duplicate SMS messages.

## 2. Database-Enforced Idempotency Solution

Phase 4.2 enforces uniqueness at the PostgreSQL schema level instead of relying solely on pooled advisory locks or read-then-write heuristics:

1. **Unique Column & Index:** Added nullable `dedupKey String? @unique` backed by `CREATE UNIQUE INDEX "NotificationJob_dedupKey_key" ON "NotificationJob" ("dedupKey")`. In SQL and PostgreSQL, multiple `NULL` values remain distinct (manual ad-hoc custom broadcasts without `dedupKey` are unaffected), while non-null keys enforce global uniqueness.
2. **Deterministic Keys Across Automated Flows:**
   - **Appointment Reminders:** `REMINDER:${app.trackingCode}` in [`runScheduledNotificationCycle()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L575).
   - **Jalali Birthday Greetings:** `BIRTHDAY:${cust.id}:${jalaliYear}` (computed in `Asia/Tehran` Persian calendar via `Intl.DateTimeFormat("en-US-u-ca-persian")`) in [`runScheduledNotificationCycle()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L599).
   - **Booking Confirmations:** `CONFIRMATION:${updatedApp.trackingCode}` inside [`handlePaymentCallback()`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts#L851).
   - **Admin Reschedules:** `RESCHEDULE:${app.id}:${newDateStr}:${newTimeStr}` inside [`app/api/admin/appointments/reschedule/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/appointments/reschedule/route.ts#L139).
3. **Atomic Race Handling ([`enqueueNotificationJob`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L76-L150)):**
   - Performs fast-path lookup by `dedupKey` if present.
   - Wraps `db.notificationJob.create()` in `try/catch`; if a concurrent transaction races past the lookup and triggers Prisma `P2002` (unique violation), it catches the conflict, loads the winning record via `findUnique({ where: { dedupKey } })`, and returns `{ enqueued: false, job: existing }`.

## 3. Verification Proof

- **PostgreSQL 16.16 (10-way simultaneous cron test):** `Promise.all(10 x runScheduledNotificationCycle())` produced **1** `NotificationJob` row (`dedupKey: REMINDER:P42REM01`) and delivered **1** SMS. Zero errors propagated; 9 losing invocations safely caught `P2002`.
- **Distinct Appointments:** A second appointment (`P42REM02`) queued and sent independently without false collisions.
- **Repeat Sweeps:** Re-running `runScheduledNotificationCycle()` produced `remindersEnqueued = 0`.
- **Concurrent Birthday Greetings:** 6 concurrent runs on PostgreSQL 16.16 produced strictly **1** `BIRTHDAY` job and **1** SMS for the customer in the current Jalali year.
