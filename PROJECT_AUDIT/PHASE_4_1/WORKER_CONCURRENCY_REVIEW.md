# Phase 4.1 — Worker Concurrency & Parallel Execution Review

**Branch:** `fix/phase-4-reliability-notifications`  
**Inspected Files:** [`lib/notifications.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts), [`app/api/cron/notifications/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/cron/notifications/route.ts)

---

## 1. Per-Job Claim Safety vs Concurrent Cron Sweep Safety

1. **Single-Job Claim Concurrency (`processNotificationJob(jobId)`):**
   - Uses atomic optimistic SQL `UPDATE ... WHERE id = $1 AND status IN ('QUEUED', 'PENDING', 'RETRY_PENDING')`.
   - Verified in `phase4_reliability_notifications.test.ts`: two simultaneous `processNotificationJob(jobId)` calls yield `claimedCount === 1` and `MockSmsProvider.sentMessages.length === 1`.
2. **Concurrent Cron Invocation Race (`CRN-41-01`):**
   - Verified directly in `phase41_independent_checks.ts`: executing two simultaneous `runScheduledNotificationCycle()` calls (`Promise.all([runScheduledNotificationCycle(), runScheduledNotificationCycle()])`) for a due reminder (`KB-CRON-RACE`) resulted in **both** runs passing `findFirst` before either inserted -> `remindersEnqueued=[1, 1]`, **`2` `REMINDER` `NotificationJob` rows created**, and **`2` SMS sent**!
   - Root cause: `NotificationJob` has no unique `dedupKey` column/partial unique index at the PostgreSQL layer, and `runScheduledNotificationCycle()` has no PostgreSQL advisory lock (`pg_advisory_xact_lock`) or transaction serialization around sweep-and-enqueue.

---

## 2. Classified Findings

| ID | Finding | Status | Severity | Technical Evidence |
|---|---|---|---|---|
| **CRN-41-01** | **Simultaneous cron invocations can enqueue & deliver duplicate `REMINDER` / `BIRTHDAY` jobs** | **Confirmed** | **Medium** | Application-level `findFirst` check in `enqueueNotificationJob()` / `runScheduledNotificationCycle()` races under concurrent `/api/cron/notifications` hits (`remindersEnqueued=[1, 1]`, `DB REMINDER rows=2`). Note: also interacts with `OUT-41-01` when `recoverStuckSendingJobs()` runs concurrently with an active worker on an aged job. |
| WRK-41-02 | Concurrent claim race on a single already-enqueued `jobId` | **Not Found** | — | Atomic `updateMany` claim guarantees strictly 1 worker claims a given `jobId` (assuming `OUT-41-01` is fixed or `scheduledAt` is fresh). |

---

## 3. Verdict

- **Status:** **PASS WITH CONDITION (`CRN-41-01` & `OUT-41-01`)** — Safe under single-scheduler cron intervals (`*/5` minutes with lock), but requires `dedupKey` uniqueness / advisory locking + claim timestamp refresh for concurrent multi-worker safety.
