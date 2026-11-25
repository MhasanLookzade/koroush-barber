# 22 — Test Execution Log

All tests executed in isolated local development environment (`file:./dev.db`, `MOCK` payment & SMS providers) without modifying original source files.

1. **`npx tsc --noEmit`** -> **PASS** (exit code 0, 0 TypeScript errors)
2. **`npm run test:acceptance`** -> **PASS** (exit code 0, **32 PASSED, 0 FAILED**)
3. **`npm run test:db` (Run 1, pre-reset)** -> **PARTIAL FAIL** (exit code 1, 18 PASSED, 4 FAILED on Test 1 baseline emptiness due to leftover test rows; Test 4 `resetDevDatabase()` succeeded)
4. **`npm run test:db` (Run 2, post-reset)** -> **PASS** (exit code 0, **22 PASSED, 0 FAILED**)
5. **`node test/e2e_responsive.js`** -> **PASS** (exit code 0, **11/11 viewports PASS**, 0px overflow, 0 console errors)
6. **`node test/admin_responsive.js`** -> **PASS** (exit code 0, **40/40 route × viewport checks PASS**, 0px overflow)
7. **`npm run build`** -> **PASS** (exit code 0, 50/50 static and dynamic routes built)
8. **`npm run lint`** -> **FAIL** (exit code 1, prompted interactively for ESLint config because `.eslintrc.json` is absent)
