# Phase 3.3 — Independent Admin Manual Booking Verification (`PAY-31-04`)

**Branch:** `fix/phase-3.2-final-integrity`  
**Endpoint:** [`POST /api/admin/appointments`](file:///c:/Users/blue/Documents/projects/barber/app/api/admin/appointments/route.ts#L91-L260)

---

## 1. Financial Alignment with Online Booking Engine

- `POST /api/admin/appointments` now delegates deposit calculation directly to [`computeServiceDeposit(service)`](file:///c:/Users/blue/Documents/projects/barber/lib/booking-engine.ts#L38-L62) when `isDepositWaived` is false, matching `reserveSlotHold()` (`lib/booking-engine.ts`):
  - `totalPrice = Math.round(service.price)`
  - `depositPaid = isDepositWaived ? 0 : computeServiceDeposit(service)`
  - `balanceDue = Math.max(0, totalPrice - depositPaid)`
  - Invalid configurations (`<0`, `>100`, `null` percent, invalid `depositType`) throw and return HTTP `400`.
  - Any client-supplied monetary fields (`depositPaid`, `price`, `balanceDue`) in the request JSON are ignored.

---

## 2. Transaction & Concurrency Integrity

- Collision checks (including stale hold expiry and checking both active `Appointment` and unexpired `ACTIVE` `SlotHold`), customer upsert, `CONFIRMED` appointment creation, and `AuditLog` insert run inside `prisma.$transaction(..., { isolationLevel: "Serializable" })` on PostgreSQL, mapping `SLOT_CONFLICT` / `P2002` / `P2034` cleanly to HTTP `409`.

---

## 3. Live PostgreSQL 16.16 Test Evidence

| Test Case | Observed Outcome | Status |
|---|---|---|
| Fixed deposit (`75,000` of `300,000`) | `200`, `depositPaid=75000`, `balanceDue=225000` | **PASS** |
| Percentage deposit (`30%` of `450,000`, stale `depositPrice=50000`, tampered `depositPaid=1000`) | `200`, `depositPaid=135000`, `balanceDue=315000` | **PASS** |
| Zero deposit (`zeroSvc`, not waived) | `200`, `depositPaid=0`, `balanceDue=180000` | **PASS** |
| Waived deposit (`isDepositWaived: true`) | `200`, `depositPaid=0`, `balanceDue=450000` | **PASS** |
| Invalid percentage (`depositPercent: 150`) | `400` | **PASS** |
| 5 concurrent `POST /api/admin/appointments` on same slot | Strictly `1` `200` + `4` `409` conflicts | **PASS** |

---

## 4. Verdict

- **Status:** **PASS** — Manual admin booking deposit math and concurrency protection are consistent with the online booking engine.
