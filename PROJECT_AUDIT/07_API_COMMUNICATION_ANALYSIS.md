# 07 — API & Communication Analysis

## 1. Complete API Inventory

### A. Public Booking & Customer-Facing APIs
| Endpoint | Methods | Purpose | Auth | Validation / Rate Limit | Known Weaknesses |
|---|---|---|---|---|---|
| `/api/health` | `GET` | Liveness + `SELECT 1` DB check | None | N/A | Clean |
| `/api/booking/availability` | `GET` | Returns 13 hourly slots (`10:00–22:00`) for `date` | None | Date param | Ignores `WorkingHour` (`BUG-009`) |
| `/api/booking/services` | `GET` | Active service catalog | None | N/A | Clean |
| `/api/booking/hold` | `POST` | Atomic 10-min `SlotHold` + `HELD` appointment | None | IP rate limit (15/5m), phone check | PG race risk (`BUG-003`) |
| `/api/booking/pay` | `POST` | Initiates ZarinPal/Mock payment | None | IP rate limit (10/1m) | Ignores `%` deposit (`BUG-001`), missing hold owner check (`BUG-005`) |
| `/api/booking/callback` | `GET, POST` | Idempotent payment verification + confirmation | Gateway Authority | Idempotent DB check | SMS inside DB tx (`BUG-004`), no fetch timeout (`REL-001`) |
| `/api/booking/status` | `GET` | Lookup by `trackingCode` or OTP-verified `phone` | OTP (for phone) | Rate limit (30/1m), regex, masked PII | 5-digit tracking entropy (`SEC-007`) |
| `/api/booking/cancel` | `POST` | 12h cutoff cancellation | `trackingCode` + `phone` | None | Missing rate limit (`SEC-007`) |
| `/api/booking/otp/send` | `POST` | Sends 6-digit OTP SMS | None | 2m per-phone cooldown | Missing IP rate limit (`SEC-005`) |
| `/api/booking/otp/verify` | `POST` | Verifies hashed OTP (max 5 attempts) | None | 6-digit check | Clean |
| `/api/booking/calendar/[trackingCode]` | `GET` | Downloads `.ics` calendar file | `trackingCode` | Path param | Hardcoded fallback address (`BUG-010`) |
| `/api/reviews` | `GET, POST` | Public approved reviews & moderated submit | None | Zod + IP rate limit (3/10m) | Clean |

### B. Customer Auth & Portal APIs (**CRITICAL ISSUES**)
| Endpoint | Methods | Purpose | Auth | Known Weaknesses |
|---|---|---|---|---|
| `/api/auth/customer/login` | `POST` | Password login -> sets `customer_auth` | Password (`bcrypt`) | Unsigned raw ID cookie (`SEC-001`) |
| `/api/auth/customer/register` | `POST` | Creates customer -> sets `customer_auth` | None | Unsigned raw ID cookie (`SEC-001`) |
| `/api/auth/customer/me` | `GET` | Current customer profile | `customer_auth` cookie | Trust raw ID (`SEC-001`) |
| `/api/customer/appointments` | `GET` | Customer appointment history | `customer_auth` cookie | Trust raw ID (`SEC-001`) |
| `/api/customer/appointments/[id]` | `GET, PATCH` | View/cancel appointment | `customer_auth` cookie | Trust raw ID (`SEC-001`), no 12h cutoff (`BUG-007`) |
| `/api/customer/profile` | `GET, PATCH` | Update profile / password | `customer_auth` cookie | Trust raw ID (`SEC-001`) |
| `/api/customer/notifications` | `GET, PATCH` | Read / mark notifications | `customer_auth` cookie | Trust raw ID (`SEC-001`) |

### C. Legacy Unauthenticated CRUD APIs (**CRITICAL VULNERABILITY `SEC-002`**)
| Endpoint | Methods | Auth | Known Weaknesses |
|---|---|---|---|
| `/api/appointments` | `GET, POST` | **NONE** | Dumps ALL customer PII (`GET`), creates `HELD` rows (`POST`) |
| `/api/appointments/[id]` | `GET, PUT, DELETE` | **NONE** | Reads, modifies (`CONFIRMED`), or deletes any appointment |
| `/api/barbers` | `GET, POST` | **NONE** | Unauthenticated barber creation |
| `/api/barbers/[id]` | `GET, PUT, DELETE` | **NONE** | Leaks upcoming appointments, unauthenticated edit/delete |
| `/api/services` | `GET, POST` | **NONE** | Unauthenticated service creation |
| `/api/services/[id]` | `GET, PUT, DELETE` | **NONE** | Unauthenticated price tampering (`price: 1`) or deletion |

### D. Admin APIs (`/api/admin/*`)
- **All 15 protected admin endpoints** enforce `authorizeAdmin(request)` (HMAC-SHA256 `admin_token` or `Bearer`), and `payments`, `services`, `settings` enforce `OWNER` role.
- Legacy `/api/auth/login` & `/api/auth/logout` duplicate `/api/admin/auth/login` (without rate limiting on `/api/auth/login`!).
