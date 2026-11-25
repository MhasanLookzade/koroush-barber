# Phase 2.1 — Independent API Security & Authorization Review

**Branch:** `fix/phase-2-api-security`  
**Backup Baseline:** `backup/pre-phase-2` (`edfe2d8a64640ffe6a60782f83955e50149e14be`)  
**Scope:** Independent review of all Phase 2 legacy REST endpoints, cancellation endpoint, and Phase 1 authentication integrity

---

## 1. Phase 1 Baseline Integrity

- Inspected the Phase 2 diff against `backup/pre-phase-2` (`edfe2d8a64640ffe6a60782f83955e50149e14be`):
  - Phase 1 authentication modules ([`lib/auth.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/auth.ts), [`lib/edge-auth.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/edge-auth.ts), [`lib/customer-auth.ts`](file:///c:/Users/blue/Documents/projects/barber/lib/customer-auth.ts), `app/api/auth/*`, `app/api/customer/*`) remain **intact and unmodified** in Phase 2.
  - Phase 1 regression tests (`npx ts-node test/phase1_auth_security.test.ts`: 13/13) and Phase 2 regression tests (`npx ts-node test/phase2_api_security.test.ts`: 9/9) pass.

---

## 2. Legacy REST & Booking Endpoint Authorization Matrix

| Endpoint | Method | Anonymous | Authenticated Customer | `STAFF` | `ADMIN` | `OWNER` | Implementation Verified |
|---|---|---|---|---|---|---|---|
| `/api/appointments` | `GET` | `401` | `401` | Allowed | Allowed | Allowed | [`authorizeAdmin(request)`](file:///c:/Users/blue/Documents/projects/barber/app/api/appointments/route.ts#L16-L20) |
| `/api/appointments` | `POST` | `401` | `401` | Allowed | Allowed | Allowed | [`authorizeAdmin(request)`](file:///c:/Users/blue/Documents/projects/barber/app/api/appointments/route.ts#L62-L66) |
| `/api/appointments/[id]` | `GET` | `401` | `401` | Allowed | Allowed | Allowed | [`authorizeAdmin(request)`](file:///c:/Users/blue/Documents/projects/barber/app/api/appointments/%5Bid%5D/route.ts#L14-L21) |
| `/api/appointments/[id]` | `PUT` | `401` | `401` | Allowed | Allowed | Allowed | [`authorizeAdmin(request)`](file:///c:/Users/blue/Documents/projects/barber/app/api/appointments/%5Bid%5D/route.ts#L47-L54) |
| `/api/appointments/[id]` | `DELETE` | `401` | `401` | Allowed | Allowed | Allowed | [`authorizeAdmin(request)`](file:///c:/Users/blue/Documents/projects/barber/app/api/appointments/%5Bid%5D/route.ts) |
| `/api/barbers` | `GET` | Public fields | Public fields | Full (`email`, `phone`) | Full (`email`, `phone`) | Full (`email`, `phone`) | [`getAdminFromRequest(request)`](file:///c:/Users/blue/Documents/projects/barber/app/api/barbers/route.ts#L25-L49) |
| `/api/barbers` | `POST` | `401` | `401` | `403` | `403` | Allowed | [`authorizeAdmin(request, "OWNER")`](file:///c:/Users/blue/Documents/projects/barber/app/api/barbers/route.ts#L56-L60) |
| `/api/barbers/[id]` | `GET` | Public fields | Public fields | Full + upcoming appts | Full + upcoming appts | Full + upcoming appts | [`getAdminFromRequest(request)`](file:///c:/Users/blue/Documents/projects/barber/app/api/barbers/%5Bid%5D/route.ts#L26-L60) |
| `/api/barbers/[id]` | `PUT` / `DELETE` | `401` | `401` | `403` | `403` | Allowed | `authorizeAdmin(request, "OWNER")` |
| `/api/services` | `GET` | Public active catalog | Public active catalog | Public active catalog | Public active catalog | Public active catalog | [`app/api/services/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/services/route.ts#L15-L26) |
| `/api/services` | `POST` | `401` | `401` | `403` | `403` | Allowed | [`authorizeAdmin(request, "OWNER")`](file:///c:/Users/blue/Documents/projects/barber/app/api/services/route.ts#L28-L32) |
| `/api/services/[id]` | `GET` | Public active item | Public active item | Public active item | Public active item | Public active item | [`app/api/services/[id]/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/services/%5Bid%5D/route.ts#L15-L44) |
| `/api/services/[id]` | `PUT` / `DELETE` | `401` | `401` | `403` | `403` | Allowed | [`authorizeAdmin(request, "OWNER")`](file:///c:/Users/blue/Documents/projects/barber/app/api/services/%5Bid%5D/route.ts#L46-L53) |
| `/api/booking/cancel` | `POST` | Rate-limited (`10/10m` per IP) + requires matching `trackingCode` + `customerPhone` | Same | Same | Same | Same | [`app/api/booking/cancel/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/booking/cancel/route.ts#L6-L40) |

---

## 3. Classified Findings

| ID | Finding | Status | Severity | Notes |
|---|---|---|---|---|
| API-21-01 | **Unauthenticated legacy REST endpoints (SEC-002)** | **Not Found** | — | All write mutations and appointment read endpoints enforce `authorizeAdmin` (`401` anonymous, `403` insufficient role). |
| API-21-02 | **Privilege escalation from `STAFF`/`ADMIN` to `OWNER` catalog/barber writes** | **Not Found** | — | `/api/barbers`, `/api/barbers/[id]`, `/api/services`, `/api/services/[id]` mutations enforce `authorizeAdmin(request, "OWNER")`. |
| API-21-03 | **Missing brute-force rate limit on `/api/booking/cancel`** | **Not Found** | — | `checkRateLimit('cancel_ip_' + ip, 10, 10 * 60 * 1000)` enforced using `getClientIp(request)`. |
| API-21-04 | **Phase 1 authentication/session regressions** | **Not Found** | — | No Phase 1 auth files modified in Phase 2; `phase1_auth_security.test.ts` passes 13/13. |

---

## 4. Verdict on API Security

- **Status:** **PASS**
- Authorization boundaries across anonymous, customer, `STAFF`, `ADMIN`, and `OWNER` callers are properly enforced with strict Zod input validation and least-privilege role guards.
