# Phase 3.3 — Independent Legacy Appointment API Verification (`BKC-31-03`)

**Branch:** `fix/phase-3.2-final-integrity`  
**Endpoint:** [`app/api/appointments/[id]/route.ts`](file:///c:/Users/blue/Documents/projects/barber/app/api/appointments/%5Bid%5D/route.ts)

---

## 1. Authorization & Hold Ownership Verification

1. **Preserved Phase 2 Authorization:**
   - `GET` / `PUT /api/appointments/[id]` enforce `authorizeAdmin(request)` (`401` anonymous/customer).
   - `DELETE /api/appointments/[id]` enforces `authorizeAdmin(request, "OWNER")` (`401` anonymous/customer, `403` `STAFF`/`ADMIN`).
2. **Scoped Hold Cleanup (`PUT` cancellation & `DELETE`):**
   - Both run inside `prisma.$transaction`.
   - Overdue `ACTIVE` holds on `(existing.barberId, existing.date)` (`expiresAt <= now`) are transitioned to `EXPIRED`.
   - Active hold release is scoped strictly to `{ barberId: existing.barberId, slotTime: existing.date, customerPhone: existing.customerPhone, status: "ACTIVE" }` -> `status: "RELEASED"`.
   - **Isolation:** Verified live that deleting a stale appointment owned by Customer A **never** releases an active `ACTIVE` hold acquired later by Customer B on the same slot.
3. **Concurrent Updates & Confirmed Consistency (`PUT`):**
   - On `status` transition to `CONFIRMED` / `COMPLETED`, checks for conflicting confirmed appointments (`id: { not: existing.id }`) inside `Serializable` transaction on PostgreSQL and catches `P2002`/`P2034` as `409`.
   - Audit records (`LEGACY_UPDATE_APPOINTMENT` / `LEGACY_DELETE_APPOINTMENT`) are written atomically inside the transaction.

---

## 2. Live PostgreSQL 16.16 Test Evidence

| Test Case | Observed Outcome | Status |
|---|---|---|
| Anonymous `PUT /api/appointments/[id]` | `401` | **PASS** |
| `STAFF` `DELETE /api/appointments/[id]` | `403` | **PASS** |
| `PUT` `status: "CANCELLED"` | `200`, appointment `CANCELLED`, owner's active hold `RELEASED` | **PASS** |
| `OWNER` `DELETE` of Customer A's cancelled record while Customer B holds slot | `200`, Customer B's hold remains `ACTIVE` | **PASS** |
| `OWNER` `DELETE` of Customer B's own record | `200`, Customer B's hold becomes `RELEASED` | **PASS** |
| `PUT` `status: "CONFIRMED"` onto already confirmed slot | `409` | **PASS** |
| 2 concurrent `PUT` `status: "CONFIRMED"` calls on same slot | Strictly `1` `200` + `1` `409` | **PASS** |

---

## 3. Verdict

- **Status:** **PASS** — Legacy `PUT`/`DELETE /api/appointments/[id]` hold cleanup, owner isolation, RBAC, and slot consistency are verified sound.
