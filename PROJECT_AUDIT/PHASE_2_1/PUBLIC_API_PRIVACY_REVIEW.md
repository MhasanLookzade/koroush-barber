# Phase 2.1 — Public API Privacy & PII Exposure Review

**Branch:** `fix/phase-2-api-security`  
**Backup Baseline:** `backup/pre-phase-2` (`edfe2d8a64640ffe6a60782f83955e50149e14be`)  
**Scope:** Live response inspection & source audit of public REST endpoints (`/api/barbers`, `/api/barbers/[id]`, `/api/services`, `/api/services/[id]`)

---

## 1. Live Response Field Verification (`http://localhost:3000`)

| Endpoint | Caller Role | Observed Top-Level JSON Keys | Sensitive / PII Fields Present? |
|---|---|---|---|
| `GET /api/barbers` | Anonymous / Public | `id`, `name`, `title`, `bio`, `avatar`, `rating`, `reviewCount`, `isActive`, `createdAt`, `updatedAt`, `services`, `workingHours` | **No** (`email`, `phone`, `appointments` excluded) |
| `GET /api/barbers/barber-kourosh` | Anonymous / Public | `id`, `name`, `title`, `bio`, `avatar`, `rating`, `reviewCount`, `isActive`, `services`, `workingHours` | **No** (`email`, `phone`, `appointments` excluded) |
| `GET /api/barbers/barber-kourosh` | Authenticated `OWNER` | Includes `email`, `phone`, `appointments` in addition to public fields | **Expected** (Admin-only privileged view) |
| `GET /api/services` | Anonymous / Public | `id`, `name`, `description`, `price`, `depositPrice`, `depositType`, `depositPercent`, `duration`, `image`, `category`, `sortOrder`, `isActive`, `createdAt`, `updatedAt` | **No** |
| `GET /api/services/[id]` | Anonymous / Public | Service keys + `barbers` (selecting `{ id, name, title, avatar }` only) | **No** |

---

## 2. Classified Findings

| ID | Finding | Status | Notes |
|---|---|---|---|
| PRI-21-01 | **Public barber PII leakage (`email`, `phone`, `appointments`)** | **Not Found** | Remediated in Phase 2; verified both in live HTTP responses and `test/phase2_api_security.test.ts`. |
| PRI-21-02 | **Customer PII leakage via `/api/appointments` or `/api/appointments/[id]`** | **Not Found** | Anonymous callers receive `401`; authenticated customers and `STAFF`/`ADMIN`/`OWNER` are scoped/authorized (covered in `INDEPENDENT_API_SECURITY_REVIEW.md`). |
| PRI-21-03 | **Service endpoint leaking barber contact details** | **Not Found** | `/api/services/[id]` projects `{ id, name, title, avatar }` only for linked barbers. |

---

## 3. Verdict on Public API Privacy

- **Status:** **PASS**
- Public catalog endpoints expose only intended public catalog/schedule attributes without leaking staff contact details or customer appointment data.
