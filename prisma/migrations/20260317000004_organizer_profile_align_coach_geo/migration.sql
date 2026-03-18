-- Rename orgName -> name in organizer_profiles (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizer_profiles' AND column_name = 'orgName'
  ) THEN
    ALTER TABLE "organizer_profiles" RENAME COLUMN "orgName" TO "name";
  END IF;
END$$;

-- Add new columns to organizer_profiles
ALTER TABLE "organizer_profiles" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "organizer_profiles" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "organizer_profiles" ADD COLUMN IF NOT EXISTS "socialLinks" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "organizer_profiles" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add geocoding columns to coach_profiles
ALTER TABLE "coach_profiles" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "coach_profiles" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
