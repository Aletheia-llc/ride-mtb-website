-- Task 4: Expand CoachingClinic stub to full model
-- The table already exists from the initial stub. Add all new columns idempotently.

ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "slug"        TEXT         NOT NULL DEFAULT '';
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "title"       TEXT         NOT NULL DEFAULT '';
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "startDate"   TIMESTAMPTZ  NOT NULL DEFAULT NOW();
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "endDate"     TIMESTAMPTZ;
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "location"    TEXT         NOT NULL DEFAULT '';
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "latitude"    DOUBLE PRECISION;
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "longitude"   DOUBLE PRECISION;
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "capacity"    INTEGER;
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "costCents"   INTEGER;
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "isFree"      BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "calcomLink"  TEXT;
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "status"      "event_statuses" NOT NULL DEFAULT 'published';
ALTER TABLE "coaching_clinics" ADD COLUMN IF NOT EXISTS "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW();

-- Unique constraint on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'coaching_clinics_slug_key'
      AND conrelid = 'coaching_clinics'::regclass
  ) THEN
    ALTER TABLE "coaching_clinics" ADD CONSTRAINT "coaching_clinics_slug_key" UNIQUE ("slug");
  END IF;
END $$;

-- Index on (startDate, status)
CREATE INDEX IF NOT EXISTS "coaching_clinics_startDate_status_idx"
  ON "coaching_clinics" ("startDate", "status");

-- Index on (latitude, longitude)
CREATE INDEX IF NOT EXISTS "coaching_clinics_latitude_longitude_idx"
  ON "coaching_clinics" ("latitude", "longitude");
