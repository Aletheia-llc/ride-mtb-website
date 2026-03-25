-- Add MTB-specific fields, seller type, and trades to listings
ALTER TABLE "public"."listings"
  ADD COLUMN IF NOT EXISTS "frameSize"    TEXT,
  ADD COLUMN IF NOT EXISTS "wheelSize"    TEXT,
  ADD COLUMN IF NOT EXISTS "forkTravel"   INTEGER,
  ADD COLUMN IF NOT EXISTS "rearTravel"   INTEGER,
  ADD COLUMN IF NOT EXISTS "frameMaterial" TEXT,
  ADD COLUMN IF NOT EXISTS "sellerType"   TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS "acceptsTrades" BOOLEAN NOT NULL DEFAULT false;
