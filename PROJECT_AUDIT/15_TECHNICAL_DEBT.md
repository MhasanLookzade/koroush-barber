# 15 — Code Maintainability & Technical Debt

## 1. Classification of Components

### Well-Designed (Leave Unchanged / Minor Polish Only)
- `lib/jalali.ts` — Clean, deterministic Gregorian ↔ Jalali math & Tehran timezone utilities.
- `lib/admin-auth.ts` & `middleware.ts` — Clean RBAC (`OWNER`/`STAFF`) pattern (once fallback secret in `lib/auth.ts` / `lib/edge-auth.ts` is fixed).
- `compose.production.yml`, `Dockerfile`, `scripts/backup-postgres.sh` — Well-hardened containerization and backup automation.
- `app/globals.css` & `tailwind.config.ts` — Clear three-layer design token system and self-hosted Persian typography.

### Functional but Requires Targeted Fixes
- `lib/booking-engine.ts` — Add partial unique index / `Serializable` isolation (`BUG-003`), move SMS outside transaction (`BUG-004`), read `WorkingHour` (`BUG-009`), share `computeServiceDeposit`.
- `lib/providers/payment.ts` & `lib/providers/sms.ts` — Add `AbortSignal.timeout` and response validation (`REL-001`).
- `deploy/nginx/koroushbarber.conf` — Fix `add_header` inheritance in static locations + add rate limiting (`SEC-009`).

### Needs Refactoring / Removal
- **Unauthenticated Legacy Routes (`SEC-002`):** `app/api/appointments/*`, `app/api/barbers/*`, `app/api/services/*`, `app/api/auth/login` — should either be removed if unused or secured with `authorizeAdmin()`.
- **Unused/Duplicate UI (`PERF-002`):** `components/booking/BookingWizard.tsx` (`37.5 KB`) and `components/booking/TimeSlotPicker.tsx.bak` (`6.4 KB` leftover backup file) alongside `BookingStudio.tsx` (`66.8 KB`).
- **Monolithic Pages (`PERF-002`):** `app/(admin)/admin/page.tsx` (`77.7 KB`), `app/(admin)/admin/sms/page.tsx` (`78.3 KB`), `components/home/BookingStudio.tsx` (`66.8 KB`).
