# Phase 5 â€” PostgreSQL 16.16 Concurrency & Migration Report

**Verified PostgreSQL Engine:** `PostgreSQL 16.16 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit`

## 1. Database Schema & Indexes Verified

Migration [`20261125000003_notification_lease_and_dedup`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000003_notification_lease_and_dedup/migration.sql):
- Adds nullable columns `"dedupKey"`, `"lockedAt"`, `"leaseExpiresAt"` to `"NotificationJob"`.
- Creates `NotificationJob_dedupKey_key` (`UNIQUE` B-tree index).
- Creates `NotificationJob_status_leaseExpiresAt_idx` (`(status, "leaseExpiresAt")`).
- **Pre-migration duplicate tolerance check (`barberbook_p5_dups`):** Existing historical duplicate `"REMINDER"` rows (`dedupKey IS NULL`) and stranded `"SENDING"` rows survived schema deployment intact without unique constraint errors.

## 2. Live PostgreSQL 16.16 Concurrency Benchmarks Executed

| Scenario | Concurrency | DB Result | External SMS Dispatched | Suite |
|---|---|---|---|---|
| **Worker claim race** (`processNotificationJob`) | **20 parallel workers** on 1 `QUEUED` job | `1` claimed (`ACTIVE_LEASE` x `19`), lease released (`null`) on `SENT` | **1** | `phase5_final_verification` |
| **Fenced lease completion** | Stalled worker finishes after lease reclaimed (`RETRY_PENDING`) | `fencedSuccess.count === 0`; returns `SKIPPED`; newer state preserved | n/a | `phase5_final_verification` |
| **Simultaneous Cron â€” Reminders** | **2**, **10**, and **20** concurrent `runScheduledNotificationCycle()` calls | Strictly **1** `NotificationJob` created (`dedupKey: REMINDER:P5REM01`); losers catch `P2002` cleanly | **1** | `phase5_final_verification` |
| **Simultaneous Cron â€” Birthdays** | **15** concurrent `runScheduledNotificationCycle()` calls | Strictly **1** `NotificationJob` created (`dedupKey: BIRTHDAY:<id>:<year>`) | **1** | `phase5_final_verification` |
| **Concurrent `reconcile_unknown`** | Simultaneous `MARK_SENT` (`STAFF`) + `MARK_FAILED` (`OWNER`) | Atomic serialization (`[200, 409]`) â€” single winner, audit preserved | **0** | `phase5_final_verification` |
| **Slot holds & Payment callbacks** | `2x` & `10x` simultaneous holds + `2x` concurrent ZarinPal OK callbacks | `1` hold winner, `9` rejected; `1` fresh confirm + `1` idempotent repeat | **1** | `phase3_postgres_concurrency` |

## 3. Architectural Nuance Documented (`enqueueNotificationJob` inside Caller `tx`)

- In `runScheduledNotificationCycle()`, `enqueueNotificationJob(prisma, ...)` executes directly on the root client without an enclosing transaction, so `P2002` catches resolve safely via `findUnique({ where: { dedupKey } })`.
- Inside `handlePaymentCallback()` and `reschedule/route.ts`, `enqueueNotificationJob(tx, ...)` runs inside the booking transaction whose unique `trackingCode` / date-time guard precedes it. Note that if an enclosing PostgreSQL `tx` ever hit `P2002` inside `tx.notificationJob.create` directly without a `SAVEPOINT`, PostgreSQL places the transaction into aborted `25P02` state until rollbackâ€”acceptable today because upstream slot/confirmation checks guard those transitions cleanly.
