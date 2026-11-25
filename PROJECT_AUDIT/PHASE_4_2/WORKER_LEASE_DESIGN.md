# Worker Lease & Recovery Design (`OUT-41-01`)

## 1. Problem in Phase 4.1

Previously in [`lib/notifications.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts), claiming a notification job transitioned `status` to `"SENDING"` without recording dedicated lease timestamps, leaving the original `scheduledAt` intact. Consequently, any job whose `scheduledAt` was older than `60_000ms` (for example after backoff or backlog delay) immediately satisfied `recoverStuckSendingJobs()` (`scheduledAt <= cutoff`) while actively executing its HTTP request, risking concurrent job theft and duplicate SMS delivery.

## 2. Phase 4.2 Lease Architecture

### Schema Fields & Indexing
- `lockedAt DateTime?`: Recorded atomically at the instant a worker claims `QUEUED | PENDING | RETRY_PENDING -> SENDING`.
- `leaseExpiresAt DateTime?`: Set atomically to `now + leaseDurationMs` (`DEFAULT_LEASE_DURATION_MS = 60_000`, minimum bounded to `500ms`).
- `scheduledAt DateTime`: Preserved strictly for queue eligibility and exponential retry backoff scheduling â€” never overloaded as a lease proxy.
- Index `NotificationJob_status_leaseExpiresAt_idx` (`("status", "leaseExpiresAt")`) supports fast recovery sweeps.

### Atomic Lease Acquisition ([`processNotificationJob`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L156-L353))
```ts
const claim = await prisma.notificationJob.updateMany({
  where: {
    id: jobId,
    status: { in: allowedStatuses },
    ...(options.skipScheduleGuard ? {} : { scheduledAt: { lte: now } }),
  },
  data: {
    status: "SENDING",
    lockedAt: now,
    leaseExpiresAt,
  },
})
```
- If `claim.count === 0`, the worker inspects the current row and returns `{ claimed: false, reason: "ACTIVE_LEASE" }` whenever `existing.status === "SENDING"`, preventing double execution across competing workers.
- Under concurrent calls (`Promise.all([processNotificationJob(id), ...])`), SQL/PostgreSQL row locking guarantees `claim.count === 1` for strictly one winner.

### Lease Release on Every Transition
Every transition out of `"SENDING"` (`SENT`, `RETRY_PENDING`, `FAILED`, `UNKNOWN`) explicitly resets `lockedAt: null, leaseExpiresAt: null`.

### Expired-Lease Recovery ([`recoverStuckSendingJobs`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L359-L433))
Recovery selects rows where `status = "SENDING"` AND **any** of the following hold:
1. `leaseExpiresAt <= now` (active lease explicitly expired), OR
2. Legacy fallback for pre-migration rows only: `leaseExpiresAt IS NULL AND lockedAt <= fallbackCutoff`, OR
3. Legacy fallback for pre-Phase-4.2 rows: `leaseExpiresAt IS NULL AND lockedAt IS NULL AND scheduledAt <= fallbackCutoff`.

Jobs with a live lease (`leaseExpiresAt > now`) are **never matched**, even when `scheduledAt` is hours in the past.

When an expired `SENDING` row is reclaimed:
- `extractAttemptCount(job.error)` increments cumulatively (`attempt = prior + 1`).
- If `attempt < DEFAULT_MAX_ATTEMPTS` (`3`), the row transitions to `RETRY_PENDING` with `scheduledAt = now` and cleared lease fields.
- If `attempt >= DEFAULT_MAX_ATTEMPTS`, because crashing mid-`SENDING` leaves external provider acceptance uncertain, the row transitions conservatively to `UNKNOWN` rather than `FAILED` (preventing blind duplicate SMS retries).
- [`formatJobDiagnostic()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L50-L66) appends the recovery reason while preserving prior diagnostics (`|| prev: ...`), and [`recoverStuckSendingJobs()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L408-L426) writes an `AuditLog` (`action: "NOTIFICATION_RECOVERED"`) entry.
