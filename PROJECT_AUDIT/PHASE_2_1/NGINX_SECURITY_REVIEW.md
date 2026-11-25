# Phase 2.1 — Nginx Security & Reverse Proxy Configuration Review

**Branch:** `fix/phase-2-api-security`  
**Backup Baseline:** `backup/pre-phase-2` (`edfe2d8a64640ffe6a60782f83955e50149e14be`)  
**Target File:** [`deploy/nginx/koroushbarber.conf`](file:///c:/Users/blue/Documents/projects/barber/deploy/nginx/koroushbarber.conf)

---

## 1. Environment Note on Live Nginx Syntax Verification

- Local host OS is Windows; `where.exe nginx` returned no installed `nginx` binary.
- Therefore, `nginx -t` / `nginx -T` could not be executed in the local Windows development environment and should be run on the Ubuntu target host during deployment.
- Static inspection of [`deploy/nginx/koroushbarber.conf`](file:///c:/Users/blue/Documents/projects/barber/deploy/nginx/koroushbarber.conf) confirms valid directive placement for Ubuntu Nginx (`/etc/nginx/sites-enabled/` included inside `http {}`):
  - `limit_req_zone $binary_remote_addr zone=api_limit:10m rate=15r/s;` (line 8)
  - `limit_req_zone $binary_remote_addr zone=auth_otp_limit:10m rate=10r/m;` (line 9)

---

## 2. Security Header & `add_header` Inheritance Analysis

1. **Server-Level Security Headers (lines 85–90)**
   - Sets 6 security headers at `server` scope:
     - `X-Frame-Options`
     - `X-Content-Type-Options`
     - `X-XSS-Protection`
     - `Referrer-Policy`
     - `Permissions-Policy`
     - `Strict-Transport-Security`

2. **API `location` Blocks (`location ~ ^/api/(booking/otp/|admin/auth/|auth/)` and `location /api/`)**
   - Correctly configure `proxy_set_header` (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) and rate limiting (`auth_otp_limit` and `api_limit`).
   - Contain **no** `add_header` directives of their own, which means Nginx inherits all 6 `server`-level security headers onto API responses.

3. **Static `location` Blocks (`/_next/static/` and image/font regex locations)**
   - Re-declare `Cache-Control` alongside `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Strict-Transport-Security` (`always`) so `add_header` inheritance suppression does not drop core security headers on static assets.

---

## 3. Classified Findings

| ID | Finding | Status | Severity | Notes |
|---|---|---|---|---|
| NGX-21-01 | **Static `location` blocks omit `Permissions-Policy` and `X-XSS-Protection`** | **Confirmed** | Informational | Static asset `location` blocks (`/_next/static/` and image/font regex) copy 4 of the 6 `server`-level headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`), omitting `Permissions-Policy` and `X-XSS-Protection`. Low impact for static JS/CSS/font/image payloads. |
| NGX-21-02 | **API `location` blocks lack `Cache-Control: no-store` at Nginx layer** | **Confirmed** | Low | `location /` includes `add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always;`, whereas `location ~ ^/api/(booking/otp/\|admin/auth/\|auth/)` and `location /api/` omit `Cache-Control` at the Nginx layer (relying on Next.js response defaults). Adding `Cache-Control: no-store` at Nginx for `/api/` would provide defense-in-depth without overriding `server`-level headers if all 6 headers are preserved or set via `map`/include. |
| NGX-21-03 | **No `Content-Security-Policy` (CSP) header configured** | **Confirmed** | Low / Advisory | No CSP header is currently configured in Nginx. Recommended as a future hardening enhancement after auditing inline scripts/styles required by Next.js and Tailwind. |
| NGX-21-04 | **`nginx -t` / `nginx -T` syntax check unverified on Windows host** | **Confirmed** | Operational | `nginx` binary is absent on Windows; static directive syntax is valid, but live `nginx -t` must run on Ubuntu deployment target. |

---

## 4. Verdict on Nginx Configuration

- **Status:** **PASS (with minor defense-in-depth observations)**
- Reverse proxy headers (`X-Real-IP` / `X-Forwarded-For`), TLS/HSTS, rate-limit zones, and `add_header` inheritance on `/api/` and static assets are properly structured.
