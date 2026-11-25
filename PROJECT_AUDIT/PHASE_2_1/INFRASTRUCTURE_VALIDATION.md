# Phase 2.1 — Infrastructure, Secrets & Deployment Configuration Validation

**Branch:** `fix/phase-2-api-security`  
**Backup Baseline:** `backup/pre-phase-2` (`edfe2d8a64640ffe6a60782f83955e50149e14be`)  
**Scope:** [`docker-compose.yml`](file:///c:/Users/blue/Documents/projects/barber/docker-compose.yml), [`deploy/nginx/koroushbarber.conf`](file:///c:/Users/blue/Documents/projects/barber/deploy/nginx/koroushbarber.conf), [`app/admin-login/page.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/admin-login/page.tsx), and `.next` production build output

---

## 1. Database Port Binding (`docker-compose.yml`)

- Inspected [`docker-compose.yml`](file:///c:/Users/blue/Documents/projects/barber/docker-compose.yml) (lines 1–65):
  - PostgreSQL port mapping is bound to `127.0.0.1:${DB_PORT:-5432}:5432`.
  - Database is **not** exposed on `0.0.0.0` (all interfaces), preventing direct external internet access to PostgreSQL on port `5432`.

---

## 2. Production Demo Credential Exposure (`SEC-004`)

- Inspected [`app/admin-login/page.tsx`](file:///c:/Users/blue/Documents/projects/barber/app/admin-login/page.tsx) (lines 1–16):
  - `export const dynamic = "force-dynamic"`
  - `const isNonProduction = process.env.NODE_ENV !== "production"`
  - `demoAccounts` is only constructed when `isNonProduction` is true; otherwise `undefined` is passed to `<AdminLoginClient demoAccounts={demoAccounts} />`.
- Scanned `.next` production build output (`npm run build`, 50/50 routes):
  - `.next/static` scan for `admin123456|staff123456`: **0 matches** (client bundle contains zero demo credentials).
  - `.next/server/app/admin-login` scan for `admin123456|staff123456`: **1 match** inside the compiled Server Component branch guarded by `process.env.NODE_ENV !== "production"`, which is never evaluated or serialized to the client when running in `NODE_ENV=production`.

---

## 3. Classified Findings

| ID | Finding | Status | Severity | Notes |
|---|---|---|---|---|
| INF-21-01 | **PostgreSQL exposed on `0.0.0.0:5432`** | **Not Found** | — | Bound strictly to `127.0.0.1:${DB_PORT:-5432}:5432` in `docker-compose.yml`. |
| INF-21-02 | **Production-visible demo credentials (SEC-004)** | **Not Found** | — | Guarded by `NODE_ENV !== "production"` in dynamic server component `app/admin-login/page.tsx`; `0` occurrences in `.next/static` client bundles. |

---

## 4. Verdict on Infrastructure & Secret Hygiene

- **Status:** **PASS**
- Database port exposure is restricted to loopback (`127.0.0.1`), and production client bundles contain no embedded demo credentials.
