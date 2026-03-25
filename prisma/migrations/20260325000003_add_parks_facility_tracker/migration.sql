-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('SKATEPARK', 'PUMPTRACK', 'BIKEPARK');

-- CreateEnum
CREATE TYPE "FacilityPhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "type" "FacilityType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "stateSlug" TEXT,
    "operator" TEXT,
    "openingHours" TEXT,
    "surface" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "lit" BOOLEAN,
    "fee" BOOLEAN,
    "description" TEXT,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityReview" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityPhoto" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "caption" TEXT,
    "status" "FacilityPhotoStatus" NOT NULL DEFAULT 'PENDING',
    "aiVerdict" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL DEFAULT 'parks-sync',
    "syncInProgress" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncResult" JSONB,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Facility_osmId_key" ON "Facility"("osmId");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_slug_key" ON "Facility"("slug");

-- CreateIndex
CREATE INDEX "Facility_type_stateSlug_idx" ON "Facility"("type", "stateSlug");

-- CreateIndex
CREATE INDEX "Facility_stateSlug_idx" ON "Facility"("stateSlug");

-- CreateIndex
CREATE INDEX "FacilityReview_facilityId_idx" ON "FacilityReview"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityReview_facilityId_userId_key" ON "FacilityReview"("facilityId", "userId");

-- CreateIndex
CREATE INDEX "FacilityPhoto_facilityId_status_idx" ON "FacilityPhoto"("facilityId", "status");

-- CreateIndex
CREATE INDEX "FacilityPhoto_status_createdAt_idx" ON "FacilityPhoto"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "FacilityReview" ADD CONSTRAINT "FacilityReview_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityReview" ADD CONSTRAINT "FacilityReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityPhoto" ADD CONSTRAINT "FacilityPhoto_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityPhoto" ADD CONSTRAINT "FacilityPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
