# 10 — Infrastructure & DevOps Review

## 1. Container & Compose Architecture
- **`Dockerfile`:** Multi-stage `node:20-alpine` build (`base` -> `deps` -> `builder` -> `runner`). Runs as non-root `nextjs:nodejs` (UID/GID 1001), exposes port 3000, includes `HEALTHCHECK` against `http://127.0.0.1:3000/api/health`.
- **`docker-entrypoint.sh`:** Runs `prisma migrate deploy`, executes idempotent `node scripts/seed-production.js`, then `exec node server.js`.
- **`compose.production.yml`:**
  - `postgres` (`postgres:16-alpine`) isolated inside `koroush-internal` bridge network (port `5432` NOT exposed to host/WAN), memory limit `1024M`, `pg_isready` healthcheck.
  - `app` bound strictly to `127.0.0.1:3000:3000`, memory limit `1536M`, reads `.env.production`.
- **`docker-compose.yml` (Dev/Root):** Exposes `5432:5432` on `0.0.0.0` and includes default credentials (`SEC-010`).

## 2. Reverse Proxy & Deployment Scripts
- **`deploy/nginx/koroushbarber.conf`:** Configures HTTP->HTTPS 301 redirect, `www`->non-`www` canonical redirect, TLS 1.2/1.3, OCSP stapling, gzip, and HSTS/security headers at `server` level.
  - **Issue (`SEC-009`):** Static asset `location` blocks (`/_next/static/` and image/font regex) define `add_header Cache-Control`, which drops parent `server` security headers in Nginx; lacks CSP and Nginx `limit_req_zone`.
- **Operational Scripts (`scripts/`):** `deploy-ubuntu.sh`, `update-production.sh`, `backup-postgres.sh`, `restore-postgres.sh`, `health-check.sh` provide repeatable Ubuntu 24.04 provisioning, 14-day gzipped backups, and health verification.
- **CI/CD:** No `.github/workflows/` CI pipeline exists; `npm run lint` fails interactively (`OPS-001`).
