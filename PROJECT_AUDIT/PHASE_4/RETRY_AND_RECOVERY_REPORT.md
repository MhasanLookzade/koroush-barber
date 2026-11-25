# Phase 4 — Retry Policies, Backoff & Recovery Report

**Branch:** `fix/phase-4-reliability-notifications`  
**Implementation:** [`lib/notifications.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts) & [`lib/http.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts)

---

## 1. Retry vs Non-Retry Policy Matrix

| Failure Category | Retryable? | Initial Transition | Terminal State After Exhaustion (`maxAttempts=3`) |
|---|---|---|---|
| `TIMEOUT` | Yes | `RETRY_PENDING` (`scheduledAt += backoff`) | `UNKNOWN` (cannot rule out provider receipt) |
| `INVALID_JSON` | Yes | `RETRY_PENDING` (`scheduledAt += backoff`) | `UNKNOWN` |
| `HTTP_5XX` | Yes | `RETRY_PENDING` (`scheduledAt += backoff`) | `FAILED` |
| `HTTP_429` | Yes | `RETRY_PENDING` (`scheduledAt += backoff`) | `FAILED` |
| `NETWORK_ERROR` | Yes | `RETRY_PENDING` (`scheduledAt += backoff`) | `FAILED` |
| `HTTP_4XX` / `PROVIDER_ERROR` (non-429) | No | Immediate terminal | `FAILED` |
| `CONFIG_ERROR` (missing API key) | No | Immediate terminal | `FAILED` |

---

## 2. Exponential Backoff Formula & Worker Restart Recovery

- **Backoff:** `computeExponentialBackoffMs(attempt, baseBackoffMs=30_000)` = `30s` after attempt 1, `60s` after attempt 2, capped at `15m`.
- **Restart Persistence:** Attempt counter (`[att:k/3|corr:...|cat:...]`) and `nextRetryAt` (`scheduledAt`) are persisted inside the `NotificationJob` row itself so exponential backoff and retry budgets survive Node process restarts.
- **Crash Recovery:** [`recoverStuckSendingJobs(staleAfterMs=60_000)`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L288-L320) scans `status = 'SENDING'` jobs whose `scheduledAt` predates `staleAfterMs`, resetting them to `RETRY_PENDING` (or `UNKNOWN` if `>= maxAttempts`).
- **Payment Initiation Exception:** ZarinPal `initiatePayment()` intentionally performs **zero blind retries** to prevent multiple gateway authority creations for one click.
