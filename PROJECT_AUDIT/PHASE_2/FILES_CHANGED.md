# Phase 2 — Files Changed

| File | Action | Reason |
|---|---|---|
| `app/api/appointments/route.ts` | Modified | Added `authorizeAdmin(request)` on `GET`/`POST`, explicit field mapping, conflict status `409`. |
| `app/api/appointments/[id]/route.ts` | Modified | Added `authorizeAdmin` (`GET`/`PUT`) and `OWNER` guard (`DELETE`), explicit fields, `404` checks. |
| `app/api/barbers/route.ts` | Modified | Stripped `email`/`phone` from public `GET`; enforced `OWNER` on `POST`. |
| `app/api/barbers/[id]/route.ts` | Modified | Stripped `email`/`phone`/`appointments` from public `GET`; enforced `OWNER` on `PUT`/`DELETE` with `404` checks. |
| `app/api/services/route.ts` | Modified | Enforced `OWNER` on `POST` with explicit field mapping. |
| `app/api/services/[id]/route.ts` | Modified | Restricted public `GET` to active service + public barber fields; enforced `OWNER` on `PUT`/`DELETE`. |
| `app/admin-login/page.tsx` | Modified | Server Component evaluating `NODE_ENV !== "production"` before passing `demoAccounts`. |
| `app/admin-login/AdminLoginClient.tsx` | Created | Password-free client login form initialized with empty `""` inputs. |
| `lib/rate-limit.ts` | Modified | Spoof-resistant `getClientIp()` (`x-real-ip` / rightmost XFF) and `.unref()` on cleanup interval. |
| `app/api/booking/otp/send/route.ts` | Modified | Added IP (`5/10m`), phone burst (`3/15m`), and DB 24h (`8/day`) rate limits. |
| `app/api/booking/cancel/route.ts` | Modified | Added IP rate limiting (`10/10m`). |
| `app/payment/mock/[authority]/page.tsx` | Modified | Same-origin validation on `callback` redirect URL (`SEC-008`). |
| `deploy/nginx/koroushbarber.conf` | Modified | Re-added security headers inside static `location` blocks + added `limit_req_zone` (`SEC-009`). |
| `docker-compose.yml` | Modified | Bound Postgres port to `127.0.0.1` (`SEC-010`). |
| `app/(admin)/admin/barbers/AdminBarbersClient.tsx` | Modified | Wrapped component in `ToastProviderComponent` to fix `useToast` 500 error. |
| `test/phase2_api_security.test.ts` | Created | Automated 9-case Phase 2 security, RBAC, PII, OTP & cancel rate-limit regression suite. |
