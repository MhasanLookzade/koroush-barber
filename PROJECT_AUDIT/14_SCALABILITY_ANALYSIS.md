# 14 — Scalability & Future Growth

## 1. Current Scalability Profile
- Designed as a **single-salon, single-VPS** application (`1` Next.js container + `1` PostgreSQL 16 container). For one barbershop (`10:00–23:00`, 13 slots/day per barber), current throughput capacity easily handles hundreds of daily visitors.

## 2. Bottlenecks Under Growth / Multi-Instance Scaling
1. **In-Memory State (`PERF-001`):** `lib/rate-limit.ts` (`rateLimitStore` Map) and `MockSmsProviderImpl` / `MockPaymentGatewayImpl` store state in process memory. Horizontal scaling across >1 Node container breaks rate limiting consistency.
2. **PostgreSQL Concurrency (`BUG-003`):** Without `Serializable` isolation or partial unique indexes, concurrent slot holds under load in PostgreSQL risk race conditions.
3. **Synchronous External Calls in DB Transaction (`BUG-004`):** Kavenegar latency directly caps payment callback DB throughput.
4. **Unbounded Log Tables:** `OtpChallenge`, `NotificationJob`, and `AuditLog` lack retention pruning or partitioning.

## 3. Pragmatic Scaling Path (Without Over-Engineering)
- **Near-Term (Single VPS):** Keep single Next.js + PostgreSQL 16 stack; move SMS outside DB tx (`BUG-004`), add partial unique indexes (`BUG-003`), add Nginx `limit_req_zone` (`SEC-009`), and add periodic cleanup for expired `OtpChallenge`/`SlotHold` rows.
- **Multi-Salon / Multi-Instance Future:** Introduce Redis for shared rate limiting & job queues (BullMQ) for scheduled reminders/birthdays, and enforce `barberId` scoping across `ScheduleOverride` and `AdminDashboard`.
