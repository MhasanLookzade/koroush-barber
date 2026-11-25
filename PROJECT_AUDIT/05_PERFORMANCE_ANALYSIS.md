# 05 — Performance & Resource Analysis

## 1. Resource & Runtime Profile
- **Runtime:** Single Node.js 20 Alpine process (`node server.js` standalone, `1536M` container memory limit in `compose.production.yml`) + PostgreSQL 16 (`1024M` limit).
- **Bundle Footprint (Observed from `npm run build`):**
  - Shared First Load JS: `87.2 kB`
  - Homepage `/`: `76.5 kB` page + `177 kB` First Load JS
  - Admin Dashboard `/admin`: `10.9 kB` page + `126 kB` First Load JS
  - Admin SMS `/admin/sms`: `12.3 kB` page + `113 kB` First Load JS

## 2. Identified Performance Bottlenecks & Resource Risks

| ID | Category | Observation | Impact |
|---|---|---|---|
| `BUG-004` | Transaction Lock Contention | `handlePaymentCallback()` runs `sms.sendBookingConfirmation()` (external HTTPS request) inside `prisma.$transaction()` (`lib/booking-engine.ts:652`). | Holds database row locks and connection pool slots for full HTTP RTT; risks 5s transaction timeout. |
| `REL-001` | Socket / Worker Exhaustion | `ZarinPalPaymentGatewayImpl` and `KavenegarSmsProviderImpl` call `fetch()` without `AbortSignal.timeout`. | Slow/hanging upstream gateway stalls Node event loop async slots indefinitely. |
| `PERF-001` | Memory Growth & Timer | `MockSmsProviderImpl.sentMessages` (`lib/providers/sms.ts:63`) is an unbounded array; `rateLimitStore` (`lib/rate-limit.ts:11-21`) uses `setInterval(..., 60000)` without `.unref()`. | Unbounded heap growth if `MOCK` mode is left active; single-process rate limits. |
| `PERF-002` | Oversized Client Modules | `BookingStudio.tsx` (`66.8 KB`), `admin/page.tsx` (`77.7 KB`), `admin/sms/page.tsx` (`78.3 KB`), plus unused `BookingWizard.tsx` (`37.5 KB`). | Slow hydration/re-render scopes and higher code-review overhead. |
| `DB-N+1` | Sequential Updates in Cleanup | `releaseExpiredHolds()` (`lib/booking-engine.ts:97-106`) loops over `expiredHolds` issuing sequential `await prisma.appointment.updateMany(...)` calls inside a `for` loop. | Under traffic spikes with many expired holds, triggers N sequential DB round-trips on every `/api/booking/availability` request. |

## 3. Positive Performance Practices Verified
- **Self-Hosted WOFF2 Fonts:** `Estedad` & `Vazirmatn` bundled locally via `next/font/local`, eliminating external font CDN latency and CLS.
- **Nginx Gzip & Immutable Caching:** `deploy/nginx/koroushbarber.conf` configures `keepalive 32`, gzip level 6 (`font/woff2`, `application/json`, `image/svg+xml`), and 365-day caching on `/_next/static/`.
- **Dynamic vs Static Split:** 50 routes built cleanly; public marketing pages are prerendered (`○`), dynamic APIs/admin are server-rendered (`ƒ`).
