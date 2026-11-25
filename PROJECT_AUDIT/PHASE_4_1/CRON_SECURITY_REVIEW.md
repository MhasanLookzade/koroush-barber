# Phase 4.1 — Cron Security & Operations Review

**Branch:** `fix/phase-4-reliability-notifications`  
**Target Route:** [`app/api/cron/notifications/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/cron/notifications/route.ts)

---

## 1. Authentication & Authorization Verification

- **Timing-Safe Verification (`verifyCronSecret`):**
  - Rejects unset `CRON_SECRET` (`401`).
  - Rejects weak secrets `< 16` characters (`401`).
  - Requires exact `Authorization: Bearer <token>` prefix, checks byte lengths, and compares using `crypto.timingSafeEqual(a, b)` (`401` on mismatch).
  - Falls back to `authorizeAdmin(request)` for authenticated admin triggers.
- **Live Verification (`phase41_independent_checks.ts`):**
  - Unset `CRON_SECRET` -> `401` (**PASS**)
  - Weak `<16` char secret -> `401` (**PASS**)
  - Wrong Bearer token -> `401` (**PASS**)
  - Valid `>=16` char `CRON_SECRET` -> `200` (**PASS**)
  - Authenticated admin cookie fallback -> `200` (**PASS**)

---

## 2. Production VPS Operations Requirements (Advisory — Not Deployed)

- **Recommended Scheduler:** `systemd` service + timer (or `flock`-guarded `cron` entry) rather than an unguarded bare `curl`, so overlapping invocations during slow upstream SMS runs are prevented at the OS scheduler layer until `CRON-41-01` DB locking is added:
  ```ini
  # Example /etc/systemd/system/barber-notifications.timer (OnCalendar=*:0/2)
  # ExecStart=/usr/bin/flock -n /run/barber-cron.lock /usr/bin/curl -fsS -m 30 -X POST -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/notifications
  ```
- **Worker Bounds:** Each `/api/cron/notifications` run drains up to `take: 50` due outbox jobs (`processDueNotificationJobs`) with bounded HTTP timeouts (`8s` per SMS request).
- **Required Env Var:** `CRON_SECRET` (`>= 16` random characters, e.g. `openssl rand -hex 32`).

---

## 3. Verdict

- **Status:** **PASS** — Cron endpoint authentication fails closed and resists timing/weak-secret attacks; single-instance `flock`/timer serialization addresses `CRN-41-01` operationally even prior to code-level DB locking.
