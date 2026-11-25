# Phase 4.3 â€” Independent `UNKNOWN` Reconciliation & RBAC Review

## 1. End-to-End Operator Workflow Inspected

Reviewed [`app/(admin)/admin/sms/page.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/(admin)/admin/sms/page.tsx), [`app/api/admin/sms/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/sms/route.ts), and [`lib/admin-auth.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/admin-auth.ts):

| Requirement | Verification Result | Evidence |
|---|---|---|
| **UNKNOWN displayed distinctly** | **PASS (with minor top-card note)** | Live Chromium check on `/admin/sms` (Tab 4 `"Ù„Ø§Ú¯â€ŒÙ‡Ø§ Ùˆ ØªØ§Ø±ÛŒØ®Ú†Ù‡ Ø§Ø±Ø³Ø§Ù„"`) shows visible amber badge `"Ù†Ø§Ù…Ø´Ø®Øµ (Ù†ÛŒØ§Ø² Ø¨Ù‡ Ø¨Ø±Ø±Ø³ÛŒ)"`, amber warning alert `"Ø§Ø­ØªÙ…Ø§Ù„ Ø«Ø¨Øª Ù¾ÛŒØ§Ù… Ø¯Ø± Ø³Ø±ÙˆÛŒØ³ Ù¾ÛŒØ§Ù…Ú© ÙˆØ¬ÙˆØ¯ Ø¯Ø§Ø±Ø¯..."`, and `<option value="UNKNOWN">` in status filter. *Minor note (`OBS-UI-43-01`)*: `GET /api/admin/sms` returns separate `stats.failed` and `stats.unknown`, while the top 4th summary KPI card displays only `data.stats.failed`. |
| **Admin confirmation audited** | **PASS** | `confirmUnknownResend: true` writes `AuditLog(action: "ADMIN_CONFIRMED_RESEND_UNKNOWN_SMS", entity: "NotificationJob", entityId, userId, userRole, oldData, newData)` before dispatch. |
| **Reconciliation to `SENT` (`MARK_SENT`)** | **PASS** | Transitions status `UNKNOWN -> SENT`, sets `sentAt = now`, clears `lockedAt`/`leaseExpiresAt`, dispatches **0** duplicate SMS, writes `AuditLog(action: "ADMIN_RECONCILED_UNKNOWN_SMS")` preserving original `oldData.error`. |
| **Reconciliation to `FAILED` (`MARK_FAILED`)** | **PASS** | Transitions status `UNKNOWN -> FAILED`, keeps `sentAt = null`, clears leases, appends operator note to `error`, and logs `AuditLog(action: "ADMIN_RECONCILED_UNKNOWN_SMS")`. |
| **Manual resend requires explicit confirmation** | **PASS** | `PATCH /api/admin/sms` `{ action: "retry", jobId }` on `UNKNOWN` without `confirmUnknownResend: true` returns **`409`** (`requiresConfirmation: true`) and sends `0` SMS; UI executes `window.confirm(...)`. |
| **Concurrent retry requests rejected** | **PASS** | Tested **5 simultaneous confirmed retries** on PostgreSQL 16.16: `statuses = [200, 409, 409, 409, 409]`, strictly **1** SMS sent. |
| **`STAFF` & `OWNER` authorization preserved** | **PASS** | Both `STAFF` and `OWNER` authenticate via `authorizeAdmin(request)` cleanly (`GET`, `POST`, `PATCH`) with exact `userRole` attributed in `AuditLog`; unauthenticated and customer requests reject with **`401`**. |

## 2. Independent Finding Confirmed in Reconciliation Concurrency (`REC-43-01`)

- **Classification:** **Confirmed (Low Severity)**
- **Location:** [`app/api/admin/sms/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/sms/route.ts#L372-L418) (`action === "reconcile_unknown"`).
- **Observation:** `reconcile_unknown` reads `job` outside `$transaction`, checks `if (job.status !== "UNKNOWN")`, and then runs `tx.notificationJob.update({ where: { id: job.id } })` without constraining `where: { id: job.id, status: "UNKNOWN" }`.
- **Live PostgreSQL 16 Verification:** Concurrent `[MARK_SENT, MARK_FAILED]` calls on the same `UNKNOWN` row returned `statuses = 200, 200` (last-writer-wins overwrite rather than `409 Conflict` for the second concurrent administrator). Does **not** trigger duplicate SMS (neither sends an SMS), only affects conflicting concurrent admin UI clicks on the same `UNKNOWN` record. Recommended as a simple future hardening improvement (`updateMany({ where: { id: job.id, status: "UNKNOWN" } })`).
