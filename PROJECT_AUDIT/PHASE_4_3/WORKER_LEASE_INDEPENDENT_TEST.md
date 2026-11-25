# Phase 4.3 â€” Independent Worker Lease Verification (`lib/notifications.ts`)

## 1. Source Code Inspection

Verified lines `1â€“622` of [`lib/notifications.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts):
- **Constants:** `DEFAULT_MAX_ATTEMPTS = 3`, `DEFAULT_BASE_BACKOFF_MS = 30_000`, `DEFAULT_LEASE_DURATION_MS = 60_000` (bounded via `Math.max(500, ...)`).
- **Atomic Claim (`updateMany`):**
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
  - Claim is a single atomic SQL `UPDATE ... WHERE id = $1 AND status IN (...) [AND scheduledAt <= now]` checked via `claim.count === 0`.
  - When `claim.count === 0`, the worker reads `existing` and returns `{ claimed: false, reason: "ACTIVE_LEASE" }` whenever `existing.status === "SENDING"`, blocking concurrent duplicate processing.
  - `scheduledAt` is never modified during claim acquisition, preventing premature expiration heuristics from colliding with backoff schedules.
- **Lease Cleanup on All Exit Transitions:**
  - Success -> `"SENT"`: `lockedAt: null, leaseExpiresAt: null, sentAt: new Date(), error: null` (plus `NOTIFICATION_RECOVERED` in `AuditLog` when `previousError` existed).
  - Retryable error -> `"RETRY_PENDING"`: `lockedAt: null, leaseExpiresAt: null, sentAt: null, scheduledAt: now + backoff`, structured `error` retaining prior history.
  - Non-retryable terminal -> `"FAILED"`: `lockedAt: null, leaseExpiresAt: null, sentAt: null`.
  - Uncertain exhausted -> `"UNKNOWN"`: `lockedAt: null, leaseExpiresAt: null, sentAt: null`.
- **Expired Lease & Legacy `SENDING` Recovery ([`recoverStuckSendingJobs`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L359-L433)):**
  - Selects only `status: "SENDING"` rows satisfying `leaseExpiresAt <= now` OR legacy fallback `{ leaseExpiresAt: null, lockedAt: { lte: fallbackCutoff } }` OR `{ leaseExpiresAt: null, lockedAt: null, scheduledAt: { lte: fallbackCutoff } }`.
  - Uses guarded `updateMany` with the same expiration predicates before mutating status (`attempt >= DEFAULT_MAX_ATTEMPTS ? "UNKNOWN" : "RETRY_PENDING"`), clears `lockedAt`/`leaseExpiresAt`, preserves attempt history via `|| prev:`, and records `AuditLog(action: "NOTIFICATION_RECOVERED")`.

## 2. Independent PostgreSQL 16.16 Live Test Results

Executed via standalone audit harness against `PostgreSQL 16.16`:

| Check | Outcome | Observed Evidence |
|---|---|---|
| **20 concurrent claim attempts on same `QUEUED` job** (delayed provider 120ms, lease 60s) | **PASS** | `winners = 1`, `sendCount20 = 1`, `ACTIVE_LEASE rejections = 19`, final status `"SENT"`, `lockedAt = null`, `leaseExpiresAt = null` |
| Aged `QUEUED` job (`scheduledAt` `-2h`) with active `SENDING` lease immunity | **PASS** | `recoverStuckSendingJobs()` returned `0` while active lease remained valid (`leaseExpiresAt > now`) |
| Exit transition lease cleanup (`RETRY_PENDING`, `FAILED`, `UNKNOWN`) | **PASS** | All three transitions explicitly verified `lockedAt === null && leaseExpiresAt === null` |
| Pre-migration legacy `SENDING` row (`lockedAt: null, leaseExpiresAt: null, scheduledAt: -10m`) | **PASS** | `recoverStuckSendingJobs(60_000)` reclaimed `1` row safely and `processDueNotificationJobs()` delivered `SENT` without altering existing `SENT` rows |
| Worker crash before exhausted retry limit -> restart recovery | **PASS** | Reclaimed to `RETRY_PENDING` -> delivered cleanly -> `AuditLog(NOTIFICATION_RECOVERED)` created |
