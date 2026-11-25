# Phase 1.1 — Authentication Consumer Inventory

Full repository search across `app/`, `components/`, `lib/`, `middleware.ts`, and `test/` for all authentication symbols and cookies:

| Consumer | Auth Mechanism | Status |
|---|---|---|
| `middleware.ts` | `verifyAdminTokenEdge()` on `admin_token` \|\| `admin_auth` (`/admin/:path*`) | **Verified Consistent** |
| `app/(admin)/layout.tsx` | `verifyAdminToken()` on `admin_token` \|\| `admin_auth` | **Verified Consistent** |
| `app/(admin)/admin/barbers/page.tsx` | `verifyAdminToken()` on `admin_token` \|\| `admin_auth` | **Migrated in Phase 1** |
| `lib/admin-auth.ts` (`authorizeAdmin`) | `verifyAdminToken()` on cookies or `Authorization: Bearer` | **Verified Consistent** |
| All 15 `/api/admin/*` routes (excl. login/logout) | `authorizeAdmin(request)` (+ `"OWNER"` on `payments`, `services`, `settings`) | **Verified Consistent** |
| `app/api/admin/auth/login/route.ts` | `verifyPassword` + `signAdminToken` + `checkRateLimit` | **Verified Consistent** |
| `app/api/auth/login/route.ts` | `verifyPassword` + `signAdminToken` + `checkRateLimit` + signed `admin_auth` | **Migrated in Phase 1** |
| `app/api/admin/auth/logout/route.ts` & `/api/auth/logout/route.ts` | Clears both `admin_token` & `admin_auth` (`Max-Age=0`) | **Verified Consistent** |
| `lib/customer-auth.ts` (`authorizeCustomer`, `getCustomerFromRequest`) | `verifyCustomerToken()` on `customer_auth` cookie or `Bearer` | **Created in Phase 1** |
| `app/api/auth/customer/login` & `register` | `signCustomerToken()` -> signed `customer_auth` cookie | **Migrated in Phase 1** |
| `app/api/auth/customer/me` | `getCustomerFromRequest()` | **Migrated in Phase 1** |
| `app/api/customer/appointments/route.ts` & `[id]/route.ts` | `authorizeCustomer(request)` | **Migrated in Phase 1** |
| `app/api/customer/profile/route.ts` & `notifications/route.ts` | `authorizeCustomer(request)` | **Migrated in Phase 1** |
| `app/api/auth/customer/logout/route.ts` | Clears `customer_auth` (`Max-Age=0`) | **Verified Consistent** |

**Result:** **Zero** remaining consumers trust unsigned `customer_auth` or `admin_auth="true"` values.
