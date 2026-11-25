# Phase 4.3 â€” SMS Duplication Risk Assessment

## 1. Duplication Vectors Closed in Phase 4.2

| Vector | Former Risk | Phase 4.2 Control | Residual Risk |
|---|---|---|---|
| **Concurrent Cron Sweeps (`CRN-41-01`)** | 2+ `/api/cron/notifications` hits enqueued duplicate `REMINDER` and `BIRTHDAY` rows | `NotificationJob_dedupKey_key` unique B-tree index in PostgreSQL (`2`, `10`, `20` simultaneous runs verified) | **Eliminated** at database constraint layer |
| **Premature Recovery Stealing Aged Active Jobs (`OUT-41-01`)** | Aged `QUEUED` (`scheduledAt` > 60s) stolen mid-`SENDING` | Dedicated `lockedAt` + `leaseExpiresAt` columns; active leases skipped (`0` reclaimed in live test) | **Eliminated** unless an external HTTP call hangs *longer than `leaseDurationMs` (`60s`)* while app HTTP timeout is already bounded at `10s` |
| **Parallel Worker Races** | 2 workers claiming the same outbox row | Atomic SQL `updateMany` with `status IN (...)` + PostgreSQL row lock (20 concurrent claims -> 1 winner) | **Eliminated** |
| **Blind Admin Retries on `UNKNOWN` Outcomes (`UI-41-01`)** | Clicking resend on timed-out / malformed response re-sent possible delivered SMS | Backend returns `409` without `confirmUnknownResend: true`; UI prompts warning and offers `"ØªØ§ÛŒÛŒØ¯ Ø§Ø±Ø³Ø§Ù„ Ù‚Ø¨Ù„ÛŒ"` (`MARK_SENT`) | **Mitigated** (requires explicit operator intent) |
| **Idempotent Payment Callbacks** | Concurrent gateway callbacks re-sending confirmations | Slot hold/payment confirmation tx + deterministic `dedupKey: CONFIRMATION:<trackingCode>` | **Eliminated** |

## 2. Residual Honest Duplication Windows (Architectural Reality)

1. **Post-Provider-Acceptance Crash (Scenario C):**
   - If the Kavenegar HTTP request reaches Kavenegar and is queued by Kavenegar, and the Node.js process is terminated (`SIGKILL`/OOM/power loss) *before* `prisma.notificationJob.update({ data: { status: "SENT" } })` commits, the row remains `SENDING` until `leaseExpiresAt` expires (`60s`), after which crash recovery transitions it to `RETRY_PENDING` (or `UNKNOWN` at attempt 3) and retries once.
   - Because there is no two-phase distributed transaction between Kavenegar and PostgreSQL and no inbound Kavenegar message-status lookup (`SMS-41-02`), preventing silent message loss requires accepting this narrow at-least-once duplicate window on crash after HTTP dispatch.
2. **HTTP Timeout Ambiguity:**
   - When Kavenegar takes `>10s` (`TIMEOUT`) or returns malformed `200`/`502` (`INVALID_JSON`), the provider *may* still have accepted the message. Retry attempts `1 -> 2` retry transient faults; retry exhaustion (`attempt 3`) stops automatically in `UNKNOWN` specifically to halt automatic duplication and hand control to human reconciliation (`reconcile_unknown`).
3. **Manual Admin Override:**
   - An administrator explicitly confirming `"Ø¨Ø±Ø±Ø³ÛŒ Ùˆ Ø§Ø±Ø³Ø§Ù„ Ù…Ø¬Ø¯Ø¯"` (`confirmUnknownResend: true`) can still intentionally trigger a second SMS if they misverify in the Kavenegar panel. This action is explicitly logged in `AuditLog(action: "ADMIN_CONFIRMED_RESEND_UNKNOWN_SMS")`.
