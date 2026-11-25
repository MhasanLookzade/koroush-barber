# Phase 4 — Rollback Guide

**Current Branch:** `fix/phase-4-reliability-notifications`  
**Pre-Phase-4 Baseline:** `backup/pre-phase-4` (commit `0e95123` on `fix/phase-3.2-final-integrity`)  
**Earlier Preserved Backups:** `backup/pre-phase-1` (`ae409d4`), `backup/pre-phase-2` (`edfe2d8`), `backup/pre-phase-3` (`43023c5`), `backup/pre-phase-3.2` (`9a52937`)

---

## 1. Rollback Procedure

Phase 4 introduces **zero database schema migrations**; rollback is purely at the Git/application layer:

```bash
git checkout backup/pre-phase-4
```

Or revert strictly the Phase 4 changes on `fix/phase-4-reliability-notifications`:

```bash
git checkout fix/phase-4-reliability-notifications
git checkout backup/pre-phase-4 -- lib/booking-engine.ts lib/providers/payment.ts lib/providers/sms.ts app/api/admin/appointments/reschedule/route.ts app/api/admin/sms/route.ts app/api/admin/birthdays/route.ts app/api/booking/otp/send/route.ts
git clean -f lib/http.ts lib/notifications.ts app/api/cron/notifications/route.ts test/phase4_reliability_notifications.test.ts
```

Note: Any `NotificationJob` rows written with Phase 4 statuses (`QUEUED`, `RETRY_PENDING`, `UNKNOWN`) remain readable strings in PostgreSQL/SQLite and can be updated back to `PENDING`/`FAILED` if needed without data loss.
