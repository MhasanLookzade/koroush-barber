# Phase 4.3 â€” Independent Cron Deduplication Results (`PostgreSQL 16.16`)

## 1. Database Uniqueness Verification

Verified in PostgreSQL 16.16 catalog (`pg_indexes`):
```sql
CREATE UNIQUE INDEX "NotificationJob_dedupKey_key" ON public."NotificationJob" USING btree ("dedupKey")
```
Nullable `dedupKey` lets PostgreSQL treat `NULL` rows (ad-hoc admin broadcasts) as distinct while enforcing strict uniqueness across every automated deterministic key:
- `REMINDER:${app.trackingCode}`
- `BIRTHDAY:${cust.id}:${jalaliYear}`
- `CONFIRMATION:${updatedApp.trackingCode}`
- `RESCHEDULE:${app.id}:${newDateStr}:${newTimeStr}`

Inside [`enqueueNotificationJob()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L76-L150), concurrent inserts race safely into PostgreSQL's `B-tree` unique constraint; losing workers catch Prisma error code `P2002`, fetch the canonical row via `dedupKey`, and return `{ enqueued: false, job: existingByKey }`.

## 2. Independent Simultaneous Cron Matrix (PostgreSQL 16.16)

Reminders and birthday notifications were tested **separately** across **2**, **10**, and **20** simultaneous calls to [`runScheduledNotificationCycle()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L508-L612):

| Stream | Simultaneous Calls | `NotificationJob` Rows Created | Total Enqueued Returned | SMS Dispatched | Status |
|---|---|---|---|---|---|
| **Appointment Reminders** | **2** | **1** | **1** | **1** | **PASS** |
| **Appointment Reminders** | **10** | **1** | **1** | **1** | **PASS** |
| **Appointment Reminders** | **20** | **1** | **1** | **1** | **PASS** |
| **Birthday Notifications** | **2** | **1** | **1** | **1** | **PASS** |
| **Birthday Notifications** | **10** | **1** | **1** | **1** | **PASS** |
| **Birthday Notifications** | **20** | **1** | **1** | **1** | **PASS** |

## 3. Additional Functional & Edge Checks Verified on PostgreSQL 16.16

- **Different appointments produce distinct reminders:** Appointment `P43REM01` and `P43REM02` each created their own `REMINDER` job (`2` distinct rows, `2` distinct SMS sent).
- **Legitimate future reminders remain unblocked:** Appointment `P43REMFUT` (`+6h`, outside current `2h` window) was NOT enqueued at `T=0`, and DID enqueue and deliver cleanly (`1` job, `1` SMS) once simulated clock advanced to `T+4.5h`.
- **Legitimate next-year birthdays remain unblocked:** Advancing simulated clock to the matching Jalali month/day in the next Persian year (`+365`/`+366` days) generated `BIRTHDAY:<id>:<nextJalaliYear>` and sent cleanly (`2` total jobs across `2` Jalali years).

## 4. Investigation of Previous "5/6 Birthday Concurrency" Observation

In Phase 4.2 [`test/phase4_2_hardening.test.ts`](file:///c:/Users/blue/Documents/projects/barber/test/phase4_2_hardening.test.ts#L359), Section B4 launched **6** concurrent runs (`Array.from({ length: isPostgres ? 6 : 3 }, ...)`):
- All 6 invocations started past the initial `findUnique` check before the first `INSERT` committed.
- **1** invocation won the race at the PostgreSQL unique index `NotificationJob_dedupKey_key`, inserted the single `BIRTHDAY` job, and dispatched the **1** SMS.
- The other **5** invocations triggered PostgreSQL `23505` -> Prisma `P2002` (`Unique constraint failed on the fields: (dedupKey)`) at `lib/notifications.ts:114` (logged by Prisma runtime error logger to stderr before being caught).
- `isUniqueViolation(err)` caught all **5** `P2002` exceptions cleanly inside [`enqueueNotificationJob()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L132-L141), loaded the winning row (`enqueued: false`), and returned without error (`1` winner + `5` caught `P2002` collisions = **6** executions accounted for identically).
- **Architecture note (`Confirmed / Informational`):** In `catch (err)` at line `134`, [`enqueueNotificationJob()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L134) queries `prisma.notificationJob.findUnique` (root client). This works cleanly for `runScheduledNotificationCycle()` (`db === prisma`, no outer transaction). If an outer Prisma interactive `tx` ever relied on catching `P2002` without a PostgreSQL savepoint, PostgreSQL aborts the enclosing transaction stateâ€”currently non-triggering because confirmation and reschedule flows hold prior unique/slot guards.
