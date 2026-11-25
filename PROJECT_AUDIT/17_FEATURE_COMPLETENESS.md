# 17 — Feature Completeness Matrix

| Feature | Implementation Status | Integration Status | Test Status | Problems | Required Work |
|---|---|---|---|---|---|
| 6-Step Online Booking Studio | Fully Implemented | Connected (`/api/booking/availability`, `hold`, `pay`) | Acceptance + E2E | `pay/route.ts` ignores `%` deposit (`BUG-001`); PG race risk (`BUG-003`) | Extract shared deposit calc; add PG unique index / `Serializable` |
| ZarinPal & Mock Payment Flow | Fully Implemented | Connected (`/api/booking/pay`, `callback`) | Acceptance (Mock) | No fetch timeout (`REL-001`), SMS inside DB tx (`BUG-004`), Open redirect in Mock (`SEC-008`) | Add `AbortSignal.timeout`, move SMS out of tx, validate mock callback |
| Appointment Tracking & 12h Cancel | Fully Implemented | Connected (`/api/booking/status`, `cancel`, `otp/*`) | Acceptance | OTP send lacks IP rate limit (`SEC-005`), cancel lacks rate limit (`SEC-007`) | Add IP rate limiting on `/otp/send` and `/cancel` |
| Customer Portal (`/dashboard*`) | Partially Implemented | Broken/Insecure (`/api/customer/*`) | Untested | Unsigned `customer_auth` cookie (`SEC-001`), infinite spinner when logged out (`BUG-006`), cancel skips 12h cutoff (`BUG-007`) | Sign customer cookie, add `/auth` redirect, unify cancel logic |
| Admin Weekly Scheduler & 13-Slot Timeline | Fully Implemented | Connected (`/api/admin/dashboard`, `appointments`) | E2E + Acceptance | Reschedule logs fake `SENT` SMS (`BUG-002`) | Call real `getSmsProvider()` after reschedule tx |
| Admin CRM & Birthday Management | Fully Implemented | Connected (`/api/admin/customers`, `birthdays`) | E2E | Manual SMS prefill works; auto birthday cron missing (`BUG-008`) | Add scheduled cron/worker |
| Admin SMS Center (4 Tabs) | Partially Implemented | Connected (`/api/admin/sms`) | E2E | Reminder/Birthday rules save to DB but have no automated worker (`BUG-008`) | Implement cron runner for due reminders/birthdays |
| Working Hours & Availability | Partially Implemented | Disconnected (`WorkingHour` vs `booking-engine.ts`) | Acceptance (BlockedInterval) | `BlockedInterval` & `ScheduleOverride` work; `WorkingHour` is ignored (`BUG-009`) | Read `WorkingHour` per weekday in `getAvailabilityForDate()` |
| Review Moderation System | Fully Implemented | Connected (`/api/reviews`, `/api/admin/reviews`) | Acceptance | Clean | None |
| Production Docker + Nginx Deployment | Fully Implemented | Ready for Ubuntu 24.04 | Verified Config | Nginx static locations drop parent security headers (`SEC-009`) | Include security headers in static blocks + add Nginx `limit_req` |
