-- PostgreSQL Partial Unique Indexes for Booking & Slot Hold Concurrency Protection (BUG-003)
-- Prevents two concurrent requests from acquiring an ACTIVE hold or CONFIRMED/COMPLETED appointment on the same (barberId, slotTime/date).

CREATE UNIQUE INDEX IF NOT EXISTS "SlotHold_active_slot_unique"
ON "SlotHold" ("barberId", "slotTime")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_confirmed_slot_unique"
ON "Appointment" ("barberId", "date")
WHERE "status" IN ('CONFIRMED', 'COMPLETED');
