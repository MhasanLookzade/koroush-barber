# Phase 3 — Security Validation & Regression Check

**Branch:** `fix/phase-3-payment-booking-integrity`  
**Baseline:** `backup/pre-phase-3` (`43023c5`)

---

## 1. Security Controls Verified in Phase 3

1. **Server-Authoritative Pricing (Anti-Tampering):**
   - `POST /api/booking/pay` ignores client-supplied monetary amounts (`amountToman`, `price`, `depositPrice`) and charges strictly `appointment.totalPrice - appointment.balanceDue` (locked from `computeServiceDeposit` at hold creation).
   - Verified by test: passing `{ appointmentId, amountToman: 1000 }` still initiates `135,000` Toman (`1,350,000` Rial) for a 30% deposit on a `450,000` Toman service.

2. **Hold Ownership & State Authorization (`BUG-005`):**
   - `POST /api/booking/pay` enforces:
     - `customerPhone` match (HTTP `403` on mismatch) when provided.
     - `customer_auth` session match (`customerSession.customerId === appointment.customerId`, HTTP `403` on mismatch) when authenticated.
     - `SlotHold.customerPhone === appointment.customerPhone` (HTTP `403` on mismatch).
     - Explicit state allowlist `["HELD", "AWAITING_PAYMENT"]` (HTTP `400` if already `CONFIRMED`/`COMPLETED`, HTTP `409` on terminal states, HTTP `410` if hold expired).

3. **Customer Cancellation Policy & Hold Release (`BUG-007`):**
   - `PATCH /api/customer/appointments/[id]` enforces `cancellation_cutoff_hours` (12 hours default) on `CONFIRMED` appointments and releases `ACTIVE` `SlotHold` rows inside a transaction.

4. **Phase 1 & Phase 2 Regression Verification:**
   - `npx ts-node test/phase1_auth_security.test.ts`: **13 PASSED, 0 FAILED**
   - `npx ts-node test/phase2_api_security.test.ts`: **9 PASSED, 0 FAILED**
