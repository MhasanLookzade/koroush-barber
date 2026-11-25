# Phase 4.2 â€” Implementation Report

**Project:** Koroush Barber (`barberbook`)
**Branch:** `fix/phase-4.2-notification-hardening`
**Verified Baseline:** `fix/phase-4-reliability-notifications` (`05c564a`)
**Backup Branch:** `backup/pre-phase-4.2` (`05c564a`, previous backups `backup/pre-phase-1` `ae409d4`, `backup/pre-phase-2` `edfe2d8`, `backup/pre-phase-3` `43023c5`, `backup/pre-phase-3.2` `9a52937`, `backup/pre-phase-4` `0e95123` preserved)

---

## 1. Executive Summary

Phase 4.2 remediated strictly the four confirmed findings identified during the Phase 4.1 independent reliability audit (`OUT-41-01`, `CRN-41-01`, `UI-41-01`, `OBS-41-01`) without altering Phase 1â€“4 security, payment, or booking invariants.

| ID | Finding | Resolution Summary | Status |
|---|---|---|---|
| `OUT-41-01` | Worker claim did not track dedicated lease timestamps, overloading `scheduledAt` and risking premature theft of aged queued jobs | Added dedicated `lockedAt` and `leaseExpiresAt` fields, atomic `SENDING` lease acquisition (`DEFAULT_LEASE_DURATION_MS = 60_000`), lease clearing on exit, and expired-lease-only recovery preserving diagnostic history and emitting `NOTIFICATION_RECOVERED` audit entries | **Resolved & Verified** |
| `CRN-41-01` | Concurrent `/api/cron/notifications` runs raced on `findFirst` check-then-insert and created duplicate `REMINDER` / `BIRTHDAY` jobs | Added unique DB column `NotificationJob.dedupKey` (`NotificationJob_dedupKey_key` unique index) with deterministic keys (`REMINDER:<trackingCode>`, `BIRTHDAY:<customerId>:<jalaliYear>`, `CONFIRMATION:<trackingCode>`, `RESCHEDULE:<id>:<date>:<time>`) and `P2002` handling in [`enqueueNotificationJob()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L76-L150) | **Resolved & Verified (10-way PG 16)** |
| `UI-41-01` | Admin SMS console grouped `UNKNOWN` jobs under `"Ø¯Ø± ØµÙ"` and lacked safe operator triage controls | Added distinct `UNKNOWN` badge (`"Ù†Ø§Ù…Ø´Ø®Øµ (Ù†ÛŒØ§Ø² Ø¨Ù‡ Ø¨Ø±Ø±Ø³ÛŒ)"`), status filter option, `UNKNOWN` stats counter in `GET /api/admin/sms`, caution warning box, double-click disabling, explicit `409` guard on blind resend (`requiresConfirmation: true`), confirmed resend audit action, and manual `reconcile_unknown` (`MARK_SENT` / `MARK_FAILED`) workflow | **Resolved & Verified (API + Chromium)** |
| `OBS-41-01` | Telemetry redaction did not explicitly strip `&receptor=` or URL-encoded / JSON / payment credential parameters | Extended [`sanitizeTelemetryText()`](file:///c:/Users/blue/Documents/projects/barber/lib/http.ts#L43-L70) to safely decode percent-encoding and mask `receptor`, `mobile`, `phone`, `token*`, `code`, `otp`, `apiKey`, `api_key`, `merchant_id`, `merchantId`, `secret`, `password`, `cardPan`, `/v1/*/`, `Bearer`, `x-api-key`, and Iranian mobile numbers | **Resolved & Verified** |

---

## 2. Database & Migration Integrity

Additive migration [`20261125000003_notification_lease_and_dedup`](file:///c:/Users/blue/Documents/projects/barber/prisma/migrations/20261125000003_notification_lease_and_dedup/migration.sql) applies cleanly on both:
- **Clean PostgreSQL 16.16** (`npx prisma migrate deploy` across all 5 migrations).
- **Existing PostgreSQL 16.16 database upgrade** containing pre-existing `SENT` and `SENDING` `NotificationJob` records, preserving 100% of existing rows with nullable `dedupKey`, `lockedAt`, and `leaseExpiresAt`.

Legacy pre-migration `SENDING` rows without `leaseExpiresAt` remain safely recoverable via the backward-compatible fallback clauses in [`recoverStuckSendingJobs()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L359-L433).

---

## 3. Remaining Accepted Limitations

- **`SMS-41-02` (Provider vs. Handset Delivery Semantics):** Kavenegar HTTP `200` + `return.status === 200` confirms provider queue acceptance (`deliveryNote: "ACCEPTED_BY_PROVIDER"`), not carrier/handset delivery receipt polling or delivery webhook verification.
- **Crash Window After Provider Acceptance Before DB Commit:** Because SMS gateways are external side-effecting HTTP systems without two-phase commit, a process kill between receiving HTTP `200` from Kavenegar and committing `status = "SENT"` results in an expired `SENDING` lease later recovering as `RETRY_PENDING` or `UNKNOWN` rather than silently dropping notification intent.
- **Production Cron Serialization (`flock`):** DB unique `dedupKey` prevents duplicate `NotificationJob` creation at the database layer; adding OS-level `flock` / systemd timer serialization on deployment further avoids redundant cron sweeps.
