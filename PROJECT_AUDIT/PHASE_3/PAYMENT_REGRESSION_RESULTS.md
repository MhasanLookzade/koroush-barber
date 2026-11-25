# Phase 3 — Payment Regression Results

**Test Suite:** `npx ts-node test/phase3_postgres_concurrency.test.ts`  
**Database Engine:** `PostgreSQL 16.16 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit`  
**Result:** **29 PASSED, 0 FAILED** (Section A + Section B + Section C)

---

## Section A: Payment Calculation & Initiation Results

| Test Case | Outcome |
|---|---|
| Fixed deposit computes exact integer Tomans (`75,000`) | **PASS** |
| Percentage deposit computes `30%` of `450,000` = `135,000` (ignores stale `depositPrice`) | **PASS** |
| Zero fixed deposit computes `0` cleanly | **PASS** |
| Invalid percentage (`> 100`) throws validation error | **PASS** |
| Missing percentage (`null`) throws validation error | **PASS** |
| Invalid `depositType` throws validation error | **PASS** |
| `reserveSlotHold` returns percentage deposit `135,000` & locks `balanceDue = 315,000` | **PASS** |
| Percentage deposit payment initiates cleanly (`200`) | **PASS** |
| Client-tampered `amountToman=1000` ignored; server charges `135,000` Toman (`1,350,000` Rial) | **PASS** |
| Zero deposit service rejected by online payment gateway initiation (`400`) | **PASS** |
| `NOK` callback returns `success=false`, cancels appointment, and releases hold | **PASS** |
| First `OK` callback confirms appointment (`CONFIRMED`) | **PASS** |
| Duplicate `OK` callback is idempotent (`isIdempotentRepeat=true`) | **PASS** |
| Repeated payment request on `CONFIRMED` appointment returns `400` | **PASS** |
