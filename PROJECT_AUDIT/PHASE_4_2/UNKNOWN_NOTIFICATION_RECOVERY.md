# Unknown Notification State & Operator Recovery Workflow (`UI-41-01`)

## 1. Safety Problem Addressed

When Kavenegar requests fail with ambiguous network/protocol states (`TIMEOUT` after TCP connect or `200`/`502` malformed `INVALID_JSON` after retry exhaustion), the SMS provider *may already have queued and sent the message*. Grouping `UNKNOWN` jobs into `"Ø¯Ø± ØµÙ"` or permitting blind one-click resends risked duplicate customer messages.

## 2. Backend Enforcement ([`app/api/admin/sms/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/sms/route.ts))

### Status Counts (`GET /api/admin/sms`)
- Separates `failed` (`status = "FAILED"`) and `unknown` (`status = "UNKNOWN"`) in `stats` alongside `total`, `sent`, and `pending`.
- Supports `status=UNKNOWN` filtering accurately.

### Retry Protection (`PATCH /api/admin/sms`, `action: "retry"`)
1. If `job.status === "SENDING"`, immediately returns **`409 Conflict`** preventing concurrent interference with an active worker lease.
2. If `job.status === "UNKNOWN"` and `confirmUnknownResend !== true`, rejects the request with **`409 Conflict`** and `{ requiresConfirmation: true }` without triggering [`processNotificationJob()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L156).
3. When `confirmUnknownResend === true`, writes `AuditLog` entry `ADMIN_CONFIRMED_RESEND_UNKNOWN_SMS` recording `{ status: "UNKNOWN", error }` and `{ confirmedDuplicateRisk: true }`, then executes [`processNotificationJob()`](file:///c:/Users/blue/Documents/projects/barber/lib/notifications.ts#L156) with `allowManualRetry: true, skipScheduleGuard: true`.

### Manual Reconciliation (`PATCH /api/admin/sms`, `action: "reconcile_unknown"`)
Allows an authenticated admin who checked the Kavenegar panel to close an `UNKNOWN` row without sending a duplicate SMS:
- Validates `job.status === "UNKNOWN"` (`400` otherwise) and `resolution âˆˆ { "MARK_SENT", "MARK_FAILED" }`.
- Executes atomically inside `prisma.$transaction`:
  - Clears `lockedAt` and `leaseExpiresAt`.
  - Sets `status` to `"SENT"` (with `sentAt = now`, clearing `error`) or `"FAILED"` (appending admin reconciliation note while keeping prior error details).
  - Creates `AuditLog` (`action: "ADMIN_RECONCILED_UNKNOWN_SMS"`) preserving `oldData: { status: job.status, error: job.error }` and `newData: { status: targetStatus, note }`.

## 3. Admin UI Controls ([`app/(admin)/admin/sms/page.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/(admin)/admin/sms/page.tsx))

- [`getJobStatusMeta()`](file:///c:/Users/blue/Documents/projects/barber/app/(admin)/admin/sms/page.tsx#L48-L84) renders distinct amber styling and label `"Ù†Ø§Ù…Ø´Ø®Øµ (Ù†ÛŒØ§Ø² Ø¨Ù‡ Ø¨Ø±Ø±Ø³ÛŒ)"` for `UNKNOWN`, sky styling for `"SENDING"`, and yellow for `"RETRY_PENDING"`.
- Filter dropdown includes `<option value="UNKNOWN">Ù†Ø§Ù…Ø´Ø®Øµ (Ù†ÛŒØ§Ø² Ø¨Ù‡ Ø¨Ø±Ø±Ø³ÛŒ)</option>`.
- Mobile card view (`< md`) and desktop table (`>= md`) surface:
  - Caution notice (`Ø§Ø­ØªÙ…Ø§Ù„ Ø«Ø¨Øª Ù¾ÛŒØ§Ù… Ø¯Ø± Ø³Ø±ÙˆÛŒØ³ Ù¾ÛŒØ§Ù…Ú© ÙˆØ¬ÙˆØ¯ Ø¯Ø§Ø±Ø¯. Ù¾ÛŒØ´ Ø§Ø² Ø§Ø±Ø³Ø§Ù„ Ù…Ø¬Ø¯Ø¯ Ø§Ø³ØªØ¹Ù„Ø§Ù… Ø¨Ú¯ÛŒØ±ÛŒØ¯.`).
  - Manual reconciliation button (`ØªØ§ÛŒÛŒØ¯ Ø§Ø±Ø³Ø§Ù„ Ù‚Ø¨Ù„ÛŒ` / `ØªØ§ÛŒÛŒØ¯ Ø§Ø±Ø³Ø§Ù„` -> `reconcile_unknown` `MARK_SENT` with browser confirmation).
  - Confirmation-guarded resend button (`Ø¨Ø±Ø±Ø³ÛŒ Ùˆ Ø§Ø±Ø³Ø§Ù„ Ù…Ø¬Ø¯Ø¯` / `Ø§Ø±Ø³Ø§Ù„ Ù…Ø¬Ø¯Ø¯` -> `window.confirm(...)` warning before passing `confirmUnknownResend: true`).
  - Double-click prevention (`disabled={retryingId !== null}` while an operation is in flight).
