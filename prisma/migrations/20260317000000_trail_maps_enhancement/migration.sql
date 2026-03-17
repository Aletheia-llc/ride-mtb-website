-- Trail Maps Enhancement Migration
-- Adds new fields to TrailSystem, Trail, TrailGpsTrack (simplifiedTrack→trackData),
-- TrailReview, TrailRegion, PointOfInterest
-- Creates new tables: trail_photos, trail_system_photos, trail_review_helpful

-- AlterTable
ALTER TABLE "points_of_interest" ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "submittedByUserId" TEXT,
ADD COLUMN     "videoUrl" TEXT;

-- AlterTable (rename simplifiedTrack → trackData, add new fields)
ALTER TABLE "trail_gps_tracks" DROP COLUMN "simplifiedTrack",
ADD COLUMN     "boundsJson" TEXT,
ADD COLUMN     "contributorCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "elevationProfile" TEXT,
ADD COLUMN     "trackData" TEXT;

-- AlterTable
ALTER TABLE "trail_regions" ADD COLUMN     "boundsNeLat" DOUBLE PRECISION,
ADD COLUMN     "boundsNeLng" DOUBLE PRECISION,
ADD COLUMN     "boundsSwLat" DOUBLE PRECISION,
ADD COLUMN     "boundsSwLng" DOUBLE PRECISION,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "totalTrailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trailSystemCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "trail_reviews" ADD COLUMN     "body" TEXT,
ADD COLUMN     "helpfulCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "trail_systems" ADD COLUMN     "averageRating" DOUBLE PRECISION,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "dogFriendly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "eMtbAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "importSource" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parkingInfo" TEXT,
ADD COLUMN     "passRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rideCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seasonalNotes" TEXT,
ADD COLUMN     "submittedByUserId" TEXT,
ADD COLUMN     "totalVertFt" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "trailheadLat" DOUBLE PRECISION,
ADD COLUMN     "trailheadLng" DOUBLE PRECISION,
ADD COLUMN     "trailheadNotes" TEXT;

-- AlterTable
ALTER TABLE "trails" ADD COLUMN     "averageRating" DOUBLE PRECISION,
ADD COLUMN     "avgFlowRating" DOUBLE PRECISION,
ADD COLUMN     "avgMaintenanceRating" DOUBLE PRECISION,
ADD COLUMN     "avgRideDurationMin" DOUBLE PRECISION,
ADD COLUMN     "avgRideSpeedMph" DOUBLE PRECISION,
ADD COLUMN     "avgSceneryRating" DOUBLE PRECISION,
ADD COLUMN     "avgTechnicalRating" DOUBLE PRECISION,
ADD COLUMN     "difficultyLabel" TEXT,
ADD COLUMN     "direction" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "features" TEXT[],
ADD COLUMN     "gpsContributionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hasGpsTrack" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "importSource" TEXT,
ADD COLUMN     "lastRiddenAt" TIMESTAMP(3),
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rideCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submittedByUserId" TEXT,
ADD COLUMN     "surfaceType" TEXT;

-- CreateTable
CREATE TABLE "trail_photos" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trail_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trail_system_photos" (
    "id" TEXT NOT NULL,
    "trailSystemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trail_system_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trail_review_helpful" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "trail_review_helpful_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trail_photos_trailId_sortOrder_idx" ON "trail_photos"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "trail_system_photos_trailSystemId_sortOrder_idx" ON "trail_system_photos"("trailSystemId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "trail_review_helpful_reviewId_userId_key" ON "trail_review_helpful"("reviewId", "userId");

-- AddForeignKey
ALTER TABLE "trail_photos" ADD CONSTRAINT "trail_photos_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_system_photos" ADD CONSTRAINT "trail_system_photos_trailSystemId_fkey" FOREIGN KEY ("trailSystemId") REFERENCES "trail_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_review_helpful" ADD CONSTRAINT "trail_review_helpful_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "trail_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_review_helpful" ADD CONSTRAINT "trail_review_helpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
