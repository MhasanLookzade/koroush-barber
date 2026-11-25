# Phase 4.1 — Transactional Outbox & Crash-Timing Integrity Review

**Branch:** `fix/phase-4-reliability-notifications`  
**Inspected Code:** [`lib/notifications.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts), [`lib/booking-engine.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts), [`app/api/admin/appointments/reschedule/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/appointments/reschedule/route.ts)

---

## 1. Crash-Timing Fault Matrix (`A` through `F`)

| Crash Point | System State Immediately After Restart | Recovery Outcome & Assessment |
|---|---|---|
| **A. Before job claim** | Business event + `NotificationJob(status="QUEUED")` committed atomically. | Recovered by `processDueNotificationJobs()`; delivered once (**Zero Loss**). Verified in `phase41_independent_checks.ts`. |
| **B. After job claim (`SENDING`), before provider request** | `NotificationJob.status = "SENDING"`, `sentAt = null`. | Recovered after `staleAfterMs` (`60_000`) by `recoverStuckSendingJobs()` -> `RETRY_PENDING` -> `SENT` (**Zero Loss**). |
| **C. Before provider request returns (network timeout)** | `NotificationJob` moves `SENDING` -> `RETRY_PENDING` (attempts 1–2) or `UNKNOWN` (attempt 3). | Survives restart via persisted `error` diagnostic (`[att:...]`) & `scheduledAt`. |
| **D. During provider request (process killed)** | `NotificationJob.status = "SENDING"`. | Recovered by `recoverStuckSendingJobs()` after `staleAfterMs`. Wait: see `OUT-41-01` below on `scheduledAt` claim timestamp! |
| **E. After provider acceptance, before DB update** | SMS already queued/sent at Kavenegar, `NotificationJob.status` still `"SENDING"`. | After `staleAfterMs`, `recoverStuckSendingJobs()` moves it to `RETRY_PENDING` (or `UNKNOWN` on attempt `>=3`), meaning at-least-once semantics can send 1 duplicate SMS on an extremely rare sub-millisecond crash right between provider response and `prisma.notificationJob.update()`. Moving `SENDING` directly to `UNKNOWN` when unsure avoids auto-duplicate at the cost of manual review; current `RETRY_PENDING` chooses automatic delivery continuity. |
| **F. During final status update** | Same as Point E (handled safely at next worker poll). | Bounded (`maxAttempts = 3`). |

---

## 2. Classified Findings

| ID | Finding | Status | Severity | Technical Evidence |
|---|---|---|---|---|
| **OUT-41-01** | **`processNotificationJob()` claim does not refresh `scheduledAt`, causing premature recovery steal for aged jobs** | **Confirmed** | **Medium** | `processNotificationJob()` transitions `status` -> `"SENDING"` without setting `scheduledAt: now`. Because `recoverStuckSendingJobs(60_000)` queries `status: "SENDING", scheduledAt: { lte: Date.now() - 60_000 }`, any `QUEUED`/`RETRY_PENDING` job whose `scheduledAt` was already `>60s` in the past (e.g., an overdue reminder or delayed retry) is immediately eligible for recovery the moment Worker A claims it! Verified in `phase41_independent_checks.ts`: `recoverStuckSendingJobs(60_000)` returned `1` immediately after a job with `-120_000ms` `scheduledAt` became `"SENDING"`. If Worker B runs concurrently while Worker A's HTTP call is in flight, both can deliver (**duplicate SMS risk**). **Fix recommendation (Phase 4.2):** Set `scheduledAt: now` when transitioning to `"SENDING"` (or add `claimedAt DateTime?`). |
| OUT-41-02 | Silent notification loss on business transaction commit or worker crash | **Not Found** | — | Business event + `NotificationJob` commit atomically (`QUEUED`); crash before claim & stranded `SENDING` jobs both recover cleanly. |
| **UI-41-01** | **Admin SMS Center UI (`app/(admin)/admin/sms/page.tsx`) renders `"UNKNOWN"` as `"در صف"` and omits retry button** | **Confirmed** | **Low** | Lines `1594`, `1608`, `1663`, `1667` only special-case `"SENT"` and `"FAILED"`, leaving `"UNKNOWN"` jobs without a distinct badge or manual `"ارسال مجدد"` button despite `PATCH /api/admin/sms` supporting `"UNKNOWN"` retry. |

---

## 3. Verdict

- **Status:** **PASS WITH CONDITION (`OUT-41-01`)** — Core transactional outbox & crash recovery guarantees work cleanly, with `OUT-41-01` (`scheduledAt` claim timestamp refresh) recommended before heavy multi-worker production concurrency.
