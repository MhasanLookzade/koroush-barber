# 18 — Project Scorecard

## 1. Category Scores

| Category | Score | Weight | Evidence Summary |
|---|---|---|---|
| Software Architecture | 70/100 | 10% | Clean Next.js App Router structure & domain engine, hurt by unauthenticated legacy routes (`SEC-002`), duplicated logic (`BUG-001`, `BUG-007`), and network I/O inside DB tx (`BUG-004`). |
| Code Quality | 72/100 | 8% | Zero TypeScript errors, good domain utilities (`jalali.ts`), hurt by 67–78KB monolithic UI files (`PERF-002`) and leftover `.bak` / duplicate `BookingWizard.tsx`. |
| Security | 42/100 | 18% | **2 Critical** (`SEC-001` unsigned `customer_auth`, `SEC-002` unauthenticated legacy CRUD APIs) and **3 High** (`SEC-003` fallback secret, `SEC-004` demo creds on prod login, `SEC-005` unthrottled OTP send). |
| Performance | 74/100 | 6% | Good asset/font optimization (self-hosted WOFF2, gzip), small first-load JS (`87.2 kB`), offset by SMS inside DB tx (`BUG-004`) and loop updates in `releaseExpiredHolds`. |
| Reliability | 68/100 | 10% | Strong idempotent callback & `PAYMENT_REVIEW` reconciliation, offset by missing `fetch` timeouts (`REL-001`), fake reschedule SMS (`BUG-002`), and missing reminder worker (`BUG-008`). |
| Scalability | 65/100 | 5% | Adequate for single-VPS salon load, constrained by in-memory rate limiter (`PERF-001`) and missing PG partial unique indexes (`BUG-003`). |
| Database Design | 74/100 | 8% | Well-normalized Prisma schema with integer Tomans/Rials and audit logs; lacks PG partial unique indexes for active holds/confirmed slots (`BUG-003`) and `WorkingHour` integration (`BUG-009`). |
| API Design | 58/100 | 8% | Core `/api/booking/*` and `/api/admin/*` routes are well-structured with Zod/RBAC, severely dragged down by unauthenticated `/api/appointments*`, `/barbers*`, `/services*` (`SEC-002`). |
| Infrastructure | 80/100 | 7% | Solid `compose.production.yml` isolation, non-root Dockerfile, backup/restore scripts; minor Nginx `add_header` inheritance bug (`SEC-009`) and missing ESLint config (`OPS-001`). |
| Testing | 76/100 | 6% | Strong acceptance (32/32), DB isolation (22/22), and Playwright responsive matrices (11/11, 40/40); lacks API authorization & PostgreSQL concurrency tests. |
| Maintainability | 68/100 | 4% | Clear folder layout and TypeScript types; large monolithic components (`PERF-002`) and unused legacy routes reduce maintainability. |
| Documentation | 78/100 | 3% | Detailed Persian Ubuntu deployment guide and architecture docs; minor domain/address drift (`BUG-010`) and undocumented cron gap. |
| User Experience | 82/100 | 4% | Polished RTL Persian UX, self-hosted Estedad+Vazirmatn typography, 0px overflow across 320–1920px; infinite spinner in unauthenticated customer layout (`BUG-006`). |
| Production Readiness | 50/100 | 3% | Infrastructure is ready, **but application cannot safely launch to production** until `SEC-001`..`SEC-005` and `BUG-001`..`BUG-004` are fixed. |
| **Overall Project Quality** | **68/100** | **100%** | Weighted sum across all 14 categories; security & booking edge-case fixes will raise score above 85/100. |

**Readiness Verdict:** **Requires Major Improvements** (Specifically: Critical & High security/correctness fixes in Phases A & B).
