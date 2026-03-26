-- Add unique composite constraint on (importSource, externalId) to trail_systems
CREATE UNIQUE INDEX "trail_systems_importSource_externalId_key" ON "trail_systems"("importSource", "externalId");

-- Add unique composite constraint on (importSource, externalId) to trails
CREATE UNIQUE INDEX "trails_importSource_externalId_key" ON "trails"("importSource", "externalId");

-- Add importSource and externalId columns to trail_gps_tracks
ALTER TABLE "trail_gps_tracks" ADD COLUMN "importSource" TEXT;
ALTER TABLE "trail_gps_tracks" ADD COLUMN "externalId" TEXT;

-- Add unique composite constraint on (importSource, externalId) to trail_gps_tracks
CREATE UNIQUE INDEX "trail_gps_tracks_importSource_externalId_key" ON "trail_gps_tracks"("importSource", "externalId");
