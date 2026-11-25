# Phase 4.1 — Retry & Idempotency Review

**Branch:** `fix/phase-4-reliability-notifications`

---

## 1. Exponential Backoff & Terminal State Rules Verified

- **`computeExponentialBackoffMs(attempt, base=30_000)`:** Computes `30s` (attempt 1 -> 2), `60s` (attempt 2 -> 3), capped at `15m`, persisted via `NotificationJob.scheduledAt`.
- **`DEFAULT_MAX_ATTEMPTS = 3`:** Enforced across worker retries using persisted `[att:k/3|...]` diagnostic tracking, ensuring retry budgets persist across process restarts.
- **Transient vs Permanent Separation:**
  - Permanent `HTTP_4XX` (excluding `429`), `CONFIG_ERROR`, and invalid phones transition immediately to `FAILED` (`0` wasted retries).
  - `HTTP_429`, `HTTP_5XX`, and `NETWORK_ERROR` retry up to `3` attempts (`RETRY_PENDING`), then move to `FAILED`.
  - `TIMEOUT` and `INVALID_JSON` retry up to `3` attempts (`RETRY_PENDING`), then move to `UNKNOWN` so operators know the provider might have processed an unacknowledged request.
- **`UNKNOWN` Reconciliation:** Persisted in `NotificationJob` with correlation ID, failure category, and attempt count; operators can inspect `GET /api/admin/sms` (`stats.failed` includes both `FAILED` and `UNKNOWN`) and manually trigger `PATCH /api/admin/sms` (`action: "retry"`), which resets the attempt counter cleanly (`allowManualRetry: true`).

---

## 2. Verdict

- **Status:** **PASS** — Exponential backoff, attempt persistence, permanent failure short-circuiting, and `UNKNOWN` handling are properly implemented.
