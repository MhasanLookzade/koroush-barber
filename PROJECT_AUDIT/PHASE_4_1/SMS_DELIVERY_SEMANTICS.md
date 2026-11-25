# Phase 4.1 — Kavenegar SMS Delivery Semantics & Verification

**Branch:** `fix/phase-4-reliability-notifications`  
**Inspected File:** [`lib/providers/sms.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/providers/sms.ts)

---

## 1. Delivery Lifecycle Semantics Accurately Distinguished

| Stage | System Representation | Meaning & Limitations |
|---|---|---|
| Enqueued | `NotificationJob.status = "QUEUED"` (`sentAt = null`) | Business event & job durably committed in DB; external SMS not attempted yet. |
| Claimed / In-Flight | `NotificationJob.status = "SENDING"` | Worker has claimed the job and is invoking Kavenegar HTTP API. |
| Request Accepted by Provider | `NotificationJob.status = "SENT"`, `deliveryNote: "ACCEPTED_BY_PROVIDER"` | Kavenegar API returned HTTP `200` with `return.status === 200` (and `entries[0].messageid` logged in telemetry). **Does NOT prove telecom handset receipt** — carrier filtering or switched-off handsets are not tracked because Kavenegar delivery-status webhooks/polling are not yet implemented. |
| Transient Fault / Backoff | `NotificationJob.status = "RETRY_PENDING"` | HTTP `5xx`, `429`, `TIMEOUT`, `NETWORK_ERROR`, or `INVALID_JSON` with remaining attempts (`attempt < 3`); `scheduledAt` advanced via exponential backoff. |
| Definitive Failure | `NotificationJob.status = "FAILED"` | Permanent `HTTP_4XX` (non-429), invalid phone, `CONFIG_ERROR`, or non-uncertain transient retries exhausted. |
| Uncertain Exhaustion | `NotificationJob.status = "UNKNOWN"` | `TIMEOUT` or `INVALID_JSON` retries exhausted — Kavenegar may have accepted the request before connection loss; requires operator review before manual resend (`PATCH /api/admin/sms` `action: "retry"`). |

---

## 2. Classified Findings

| ID | Finding | Status | Severity | Notes |
|---|---|---|---|---|
| SMS-41-01 | Provider acceptance falsely conflated with handset delivery in docs/API | **Not Found** | — | API returns `deliveryStatus: "ACCEPTED_BY_PROVIDER"` and architecture explicitly documents the gap vs carrier receipt callbacks. |
| SMS-41-02 | Handset delivery receipt webhook / status polling unimplemented | **Confirmed** | Informational | Kavenegar `messageid` is accepted, but async Kavenegar `/sms/status.json` polling or webhook ingestion is not implemented; acceptable within Phase 4 scope. |
| SMS-41-03 | `URLSearchParams` OTP encoding & response validation (`REL-001`) | **Not Found** | — | Fixed cleanly across all 5 Kavenegar methods. |

---

## 3. Verdict

- **Status:** **PASS** — Kavenegar failure classification, provider-acceptance vs handset-delivery semantics, and OTP failure propagation (`503`) are accurate and verified.
