# 08 — Reliability & Fault Tolerance

## 1. Failure Mode Analysis

| Scenario | Current Behavior | Assessment |
|---|---|---|
| **Gateway Hang (ZarinPal / Kavenegar)** | `fetch()` in `lib/providers/payment.ts` and `sms.ts` has no `AbortSignal.timeout`. | **High Risk (`REL-001`)**: Requests hang until Nginx 60s `proxy_read_timeout`; Kavenegar hang inside `handlePaymentCallback` transaction causes Prisma 5s tx timeout & payment rollback (`BUG-004`). |
| **Gateway Returns HTML 502/503** | `await res.json()` throws unhandled `SyntaxError`. | **High Risk (`REL-001`)**: Causes 500 error page instead of graceful Persian error message. |
| **Delayed Payment Callback Collision** | `handlePaymentCallback()` checks `conflictingConfirmed` inside `$transaction`, transitions to `PAYMENT_REVIEW`, records `AuditLog`. | **Strong**: Prevents silent double-booking while preserving payment record for admin refund/reconciliation. |
| **Duplicate Payment Callback** | Idempotency guard checks `payment.status === "VERIFIED" && appointment.status === "CONFIRMED"` and `NotificationJob` deduplication. | **Strong**: Verified by Acceptance Scenario 6. |
| **Database Unavailable** | `/api/health` returns HTTP `503` (`status: "error"`), triggering Docker `HEALTHCHECK` after 3 retries. | **Good**: Container health monitoring works as designed. |
| **Process Crash / Restart** | `compose.production.yml` sets `restart: always`; Postgres volume `koroush_pg_data` persists data. | **Good**: In-memory `rateLimitStore` resets on restart (acceptable for single instance). |
| **Automated Reminders / Birthdays** | No worker or cron invokes reminder/birthday dispatch. | **Gap (`BUG-008`)**: Configured rules in `/admin/sms` do not run automatically. |
