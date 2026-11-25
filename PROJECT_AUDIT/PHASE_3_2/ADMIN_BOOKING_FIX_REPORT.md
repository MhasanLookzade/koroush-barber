# Phase 3.2 — `PAY-31-04` Admin Manual Booking Deposit Fix Report

**Branch:** `fix/phase-3.2-final-integrity`  
**Modified Endpoint:** [`POST /api/admin/appointments`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/appointments/route.ts#L91-L260)

---

## 1. Root Cause

- `POST /api/admin/appointments` previously computed `depositPaid = isDepositWaived ? 0 : service.depositPrice`, bypassing percentage deposit settings (`depositType === "percentage"`, `depositPercent`), integer validation, and PostgreSQL concurrency protection.

---

## 2. Corrections Implemented

1. **Authoritative Server-Side Pricing:**
   - Uses [`computeServiceDeposit(service)`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts#L38-L62) when `!isDepositWaived` (supporting fixed deposits, percentage deposits, and zero deposits cleanly).
   - Rejects invalid service deposit configurations (`<0`, `>100`, `null` percentage, invalid `depositType`) with HTTP `400`.
   - Computes `totalPrice = Math.round(service.price)` and `balanceDue = Math.max(0, totalPrice - depositPaid)` in integer Tomans.
   - Ignores any client-supplied monetary fields (`depositPaid`, `price`, `balanceDue`).
2. **Transactional Slot Exclusivity:**
   - Wraps stale-hold expiry, active hold/appointment collision checks, customer upsert, `CONFIRMED` appointment creation, and `AuditLog` persistence inside `prisma.$transaction(..., { isolationLevel: "Serializable" })` on PostgreSQL, mapping `SLOT_CONFLICT` / `P2002` / `P2034` to HTTP `409`.

---

## 3. Verified Regression Cases (`test/phase3_postgres_concurrency.test.ts` Section D)

- Fixed deposit (`75,000` of `300,000`) -> `depositPaid=75000`, `balanceDue=225000` (**PASS**).
- Percentage deposit (`30%` of `450,000` with stale `depositPrice=50000` and tampered payload `depositPaid=1000`) -> `depositPaid=135000`, `balanceDue=315000` (**PASS**).
- `isDepositWaived: true` -> `depositPaid=0`, `balanceDue=450000` (**PASS**).
- Invalid percentage service (`depositPercent: 150`) -> HTTP `400` (**PASS**).
