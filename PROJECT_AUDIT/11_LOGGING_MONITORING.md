# 11 — Logging, Monitoring & Observability

## 1. Current State
- **Application Logging:** Uses unstructured `console.error(...)` and `console.log(...)` across API route handlers; development Prisma logs raw SQL queries (`lib/db.ts:10`).
- **Audit Trail (`AuditLog` model):** Persists security/business events (`ADMIN_BLOCK_INTERVAL`, `ADMIN_SCHEDULE_OVERRIDE`, `ADMIN_RESCHEDULE_APPOINTMENT`, `PAYMENT_RECONCILIATION_ALERT`, `CUSTOMER_LOGIN`, `CUSTOMER_CANCEL_APPOINTMENT`).
- **Health Monitoring:** `GET /api/health` checks DB connectivity (`SELECT 1`) and returns JSON status (`200` / `503`); consumed by Docker `HEALTHCHECK` and `scripts/health-check.sh`.
- **Nginx Access/Error Logs:** Buffered logging to `/var/log/nginx/koroushbarber.access.log` and `.error.log`.

## 2. Diagnostic Gaps
1. **No Request Correlation IDs or Structured JSON Logging:** Tracing a failed booking across `/hold` -> `/pay` -> `/callback` requires manual timestamp matching in container stdout logs.
2. **Missing Alerting on `PAYMENT_REVIEW` Events:** When a delayed payment callback causes `PAYMENT_RECONCILIATION_ALERT`, it is written to `AuditLog` and `adminNotes`, but no admin push/SMS alert fires automatically.
3. **False `SENT` SMS Logs (`BUG-002`):** Admin reschedule writes `status: "SENT"` without calling the SMS provider, misleading operators inspecting `/admin/sms`.
4. **Observability Tooling Verdict:** For a single-VPS barbershop platform, adding Prometheus/Grafana/Loki/OpenTelemetry would introduce unnecessary RAM/operational overhead; structured JSON stdout logging (`pino`) + UptimeRobot/healthcheck alerts + logrotate are sufficient and cost-effective.
