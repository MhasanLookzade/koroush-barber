# 06 — Database & Data Management Analysis

## 1. Schema & Architecture
- **Schema:** `prisma/schema.prisma` (13 models: `Barber`, `Service`, `WorkingHour`, `ScheduleOverride`, `BlockedInterval`, `SlotHold`, `Appointment`, `Payment`, `OtpChallenge`, `Customer`, `Notification`, `AdminUser`, `SiteSetting`, `AuditLog`, `NotificationJob`, `Review` — 16 models total).
- **Migrations:** `prisma/migrations/20261124000000_init/migration.sql` targets PostgreSQL (`provider = "postgresql"`). Local development uses SQLite `prisma/dev.db` via `.env` override.
- **Financial Arithmetic:** All currency amounts (`price`, `depositPrice`, `totalPrice`, `depositPaid`, `balanceDue`, `amountToman`, `amountRial`) use `Int` (integer Tomans/Rials), avoiding floating-point precision loss.

## 2. Database Findings

1. **`BUG-003` (HIGH) — Missing DB-Level Partial Unique Indexes & `Serializable` Isolation:**
   - `SlotHold` has `@@index([barberId, slotTime])` (`schema.prisma:99`) and `Appointment` has `@@index([barberId, date])` (`schema.prisma:141`), **not** unique constraints.
   - Because `reserveSlotHold()` (`lib/booking-engine.ts:324`) uses Prisma's default `ReadCommitted` isolation in PostgreSQL, two concurrent transactions can both observe zero `ACTIVE` holds and both insert active holds for the same `(barberId, slotTime)`.
   - *Fix:* Add PostgreSQL partial unique indexes in a migration (`CREATE UNIQUE INDEX slot_hold_active_unique ON "SlotHold"("barberId", "slotTime") WHERE status = 'ACTIVE';` and `CREATE UNIQUE INDEX appointment_confirmed_unique ON "Appointment"("barberId", "date") WHERE status IN ('CONFIRMED', 'COMPLETED');`) and/or `isolationLevel: "Serializable"`.

2. **Missing Foreign Key Relation on `BlockedInterval.barberId` and `Review.trackingCode`:**
   - `BlockedInterval.barberId` (`schema.prisma:81`) is a nullable `String?` without a foreign key relation to `Barber`.
   - `NotificationJob` and `OtpChallenge` have no TTL purge/cleanup mechanism, causing unbounded table growth over long-term operation.

3. **Sequential `updateMany` Loop in `releaseExpiredHolds()` (`lib/booking-engine.ts:97-106`):**
   - Runs one `updateMany` per expired hold instead of batching inside a single query/transaction.

4. **Backup & Recovery (`scripts/backup-postgres.sh`, `scripts/restore-postgres.sh`):**
   - Uses `pg_dump ... | gzip -9` + `gzip -t` integrity check + 14-day rotation (`chmod 600`), stored in `/var/backups/koroush-barber`.
   - *Gap:* Backups are stored locally on the same VPS disk; off-site replication is not configured.
