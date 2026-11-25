-- Additive non-destructive fix for MIG-31-01:
-- Relax legacy NOT NULL constraints on Review.customerName and Review.customerPhone from 20261124000000_init
-- while preserving all existing data and never dropping columns or deleting rows.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Review' AND column_name = 'customerName'
  ) THEN
    ALTER TABLE "Review" ALTER COLUMN "customerName" DROP NOT NULL;
    UPDATE "Review"
    SET "name" = "customerName"
    WHERE ("name" = '' OR "name" IS NULL) AND "customerName" IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Review' AND column_name = 'customerPhone'
  ) THEN
    ALTER TABLE "Review" ALTER COLUMN "customerPhone" DROP NOT NULL;
  END IF;
END $$;
