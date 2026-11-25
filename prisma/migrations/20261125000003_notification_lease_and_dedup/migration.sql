-- Phase 4.2: Dedicated worker lease columns & DB-enforced reminder/notification deduplication (OUT-41-01, CRN-41-01)
-- Additive and non-destructive: preserves all existing NotificationJob records.

ALTER TABLE "NotificationJob"
  ADD COLUMN IF NOT EXISTS "dedupKey" TEXT,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationJob_dedupKey_key"
ON "NotificationJob" ("dedupKey");

CREATE INDEX IF NOT EXISTS "NotificationJob_status_leaseExpiresAt_idx"
ON "NotificationJob" ("status", "leaseExpiresAt");
