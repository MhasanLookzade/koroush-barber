# Phase 1.1 — Cookie Security Review

| Cookie | Issuer(s) | Value | HttpOnly | Secure | SameSite | Path | Max-Age | Logout Cleared |
|---|---|---|---|---|---|---|---|---|
| `customer_auth` | `/api/auth/customer/login`, `/register` | HMAC-SHA256 signed `CustomerSession` | `true` | `NODE_ENV === "production"` | `lax` | `/` | 30 days (`2592000`s) | Yes (`Max-Age=0` in `/api/auth/customer/logout`) |
| `admin_token` | `/api/admin/auth/login`, `/api/auth/login` | HMAC-SHA256 signed `AdminSession` | `true` | `NODE_ENV === "production"` | `lax` | `/` | 7 days (`604800`s) | Yes (`Max-Age=0` in both admin & legacy logout) |
| `admin_auth` | `/api/admin/auth/login`, `/api/auth/login` | HMAC-SHA256 signed `AdminSession` | `true` | `NODE_ENV === "production"` | `lax` | `/` | 7 days (`604800`s) | Yes (`Max-Age=0` in both admin & legacy logout) |

- **Session Fixation:** Login and registration always generate fresh HMAC tokens with new `exp` timestamps and overwrite any prior cookie (`Path=/`).
- **CSRF Mitigation:** `SameSite=lax` protects state-changing `POST`/`PUT`/`PATCH`/`DELETE` requests from cross-site form/fetch CSRF, while `HttpOnly` prevents XSS cookie theft.
- **Note:** `Domain` is omitted (host-only cookie), which is the safest default.
