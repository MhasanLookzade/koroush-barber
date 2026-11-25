-- Non-destructive schema alignment for AuditLog, Notification, NotificationJob, Review, and SiteSetting
-- Ensures fresh `prisma migrate deploy` matches `prisma/schema.prisma` without dropping existing columns.

ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "newData" TEXT,
  ADD COLUMN IF NOT EXISTS "oldData" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "userType" TEXT;

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "data" TEXT,
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "NotificationJob"
  ADD COLUMN IF NOT EXISTS "error" TEXT,
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'MOCK',
  ADD COLUMN IF NOT EXISTS "recipientName" TEXT;

ALTER TABLE "NotificationJob"
  ALTER COLUMN "scheduledAt" SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'NotificationJob' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "NotificationJob" ALTER COLUMN "updatedAt" DROP NOT NULL;
    ALTER TABLE "NotificationJob" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';

ALTER TABLE "SiteSetting"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "description" TEXT;
