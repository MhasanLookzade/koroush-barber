# Phase 3.2 — `BKC-31-03` Legacy Appointment Cancellation & Deletion Fix Report

**Branch:** `fix/phase-3.2-final-integrity`  
**Modified File:** [`app/api/appointments/[id]/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/appointments/%5Bid%5D/route.ts#L47-L237)

---

## 1. Root Cause

- `PUT /api/appointments/[id]` and `DELETE /api/appointments/[id]` mutated or deleted `Appointment` records outside a transaction without expiring stale holds, checking `CONFIRMED` slot collisions, or releasing the owning customer's `ACTIVE` `SlotHold`.

---

## 2. Corrections Implemented

1. **Preserved Phase 2 Authorization:**
   - `GET` / `PUT` continue enforcing `authorizeAdmin(request)` (`401` anonymous/customer).
   - `DELETE` continues enforcing `authorizeAdmin(request, "OWNER")` (`401` anonymous/customer, `403` `STAFF`/`ADMIN`).
2. **Ownership-Scoped Hold Release Inside Transaction:**
   - Both `PUT` (when `status === "CANCELLED"`) and `DELETE` run inside `prisma.$transaction(...)`.
   - Expire any overdue (`expiresAt <= now`) `ACTIVE` holds on `(existing.barberId, existing.date)` to eliminate stale holds.
   - Release `ACTIVE` holds scoped strictly to `{ barberId: existing.barberId, slotTime: existing.date, customerPhone: existing.customerPhone, status: "ACTIVE" }` -> `status: "RELEASED"`, guaranteeing **another customer's active hold on the same slot is never released**.
3. **Confirmed Slot Consistency (`PUT`):**
   - When updating status to `CONFIRMED` or `COMPLETED`, checks for conflicting `CONFIRMED`/`COMPLETED` appointments (`id: { not: existing.id }`) and maps conflicts / `P2002` / `P2034` to HTTP `409`.
   - Persists audit logs (`LEGACY_UPDATE_APPOINTMENT` / `LEGACY_DELETE_APPOINTMENT`).

---

## 3. Verified Regression Cases (`test/phase3_postgres_concurrency.test.ts` Section D)

- Unauthenticated `PUT` -> `401` (**PASS**).
- `STAFF` `DELETE` -> `403` (**PASS**).
- `PUT` `CANCELLED` updates appointment and releases owner's active hold (**PASS**).
- `OWNER` `DELETE` of customer A's stale appointment preserves customer B's `ACTIVE` hold (**PASS**).
- `OWNER` `DELETE` of customer B's own appointment releases customer B's active hold (**PASS**).
- `PUT` `CONFIRMED` onto an already confirmed slot returns `409` (**PASS**).
