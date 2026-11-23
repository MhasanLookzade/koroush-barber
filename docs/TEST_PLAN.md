# Koroush Barber — Test Plan & Quality Assurance (برنامه آزمون و تضمین کیفیت)
**Target:** 15/15 Acceptance Scenarios Passing  
**Execution:** Automated Integration Suite + End-to-End API Verifications  

---

## 1. Scope & Acceptance Criteria Matrix

| Scenario ID | Test Name | Target Outcome | Verification Mechanism |
|-------------|-----------|----------------|------------------------|
| **TC-01** | Blank Day Inventory | Exactly 13 slots (10:00 - 22:00); 23:00 never offered | `test/availability.test.ts` |
| **TC-02** | Unconfirmed Before Verify | Slot marked `HELD`; no `CONFIRMED` state until payment check | `test/booking-flow.test.ts` |
| **TC-03** | Server-Verified Payment | Confirms 1 appointment, updates ledger, fires confirmation | `test/payment.test.ts` |
| **TC-04** | Abandoned Hold Release | Expired hold returns slot to inventory after hold timeout | `test/hold-expiry.test.ts` |
| **TC-05** | Concurrency Collision | 2 concurrent booking requests for 1 slot -> exactly 1 succeeds, 1 gets 409 Conflict | `test/concurrency.test.ts` |
| **TC-06** | Callback Idempotency | Duplicate gateway callbacks produce exactly 1 appointment & 1 SMS | `test/idempotency.test.ts` |
| **TC-07** | Late Callback Reconciliation | Late verify on reallocated slot -> `PAYMENT_REVIEW` + admin alert | `test/reconciliation.test.ts` |
| **TC-08** | Admin Block Enforcement | Admin blocked window blocks slot in API & UI immediately | `test/admin-block.test.ts` |
| **TC-09** | Cancellation Policy | Server enforces cutoff window for rescheduling/cancellation | `test/cancellation.test.ts` |
| **TC-10** | Admin Balance Math | Dashboard shows correct confirmed deposit vs in-salon balance | `test/admin-stats.test.ts` |
| **TC-11** | Interrupted Flow Recovery | Refreshing or returning after payment preserves verified state | `test/recovery.test.ts` |
| **TC-12** | Jalali / Gregorian Boundary | Accurate Jalali month/year mapping across leap years & UTC | `test/jalali.test.ts` |
| **TC-13** | 360px & Keyboard A11y | WCAG 2.2 AA visible focus, 44px+ touch targets, RTL isolation | Automated CSS/DOM tests |
| **TC-14** | Admin RBAC Isolation | STAFF blocked from OWNER settings; public blocked from admin | `test/auth-rbac.test.ts` |
| **TC-15** | Zero External Secrets | Test suite runs 100% locally with embedded mock adapters | CI / local test script |

---

## 2. Test Execution Details

### Concurrency Stress Test (TC-05)
- **Method:** `Promise.all()` firing simultaneous atomic hold requests from 2 distinct simulated customer sessions targeting the exact same `slotTime` and `barberId`.
- **Expected Result:** Database transaction lock guarantees that exactly one transaction acquires the hold, and the other receives a `409 Conflict` payload with message `این ساعت دیگر در دسترس نیست`.

### Idempotency Verification (TC-06)
- **Method:** Dispatching the same gateway verification callback payload 3 times in rapid succession for a single payment authority.
- **Expected Result:** First callback confirms the booking and returns HTTP 200. Second and third callbacks detect the existing verified payment, return HTTP 200 with identical metadata, and fire zero duplicate SMS jobs.

### Late Callback Reconciliation (TC-07)
- **Method:** 
  1. Customer A holds slot 14:00. Hold expires after simulated timeout.
  2. Customer B successfully books and confirms slot 14:00.
  3. Late payment callback arrives for Customer A.
- **Expected Result:** System flags Customer A's appointment as `PAYMENT_REVIEW` with an audit alert for admin reconciliation, preventing any overwrite of Customer B's reservation.

---

## 3. Automation Harness & Test Scripts
- **Test Runner:** Custom standalone TypeScript integration harness executing against local Prisma database.
- **Command:** `npm run test:acceptance`
- **Output:** Structured terminal report confirming status of all 15 scenarios.
