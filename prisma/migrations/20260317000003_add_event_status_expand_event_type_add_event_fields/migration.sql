-- CreateEnum: event_statuses (EventStatus for event lifecycle)
CREATE TYPE "event_statuses" AS ENUM ('draft', 'pending_review', 'published', 'cancelled', 'postponed', 'completed');

-- AlterEnum: EventType — add new values
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'race_xc';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'race_enduro';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'race_dh';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'race_marathon';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'race_other';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'clinic';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'camp';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'expo';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'bike_park_day';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'virtual_challenge';

-- AlterTable events: migrate status column from ContentStatus to event_statuses
-- Existing values: 'draft' and 'published' exist in both; 'archived' does not exist in event_statuses.
-- Remap 'archived' -> 'completed' before dropping old column.
ALTER TABLE "events" ADD COLUMN "status_new" "event_statuses" NOT NULL DEFAULT 'published';
UPDATE "events" SET "status_new" = CASE
  WHEN "status"::text = 'draft' THEN 'draft'::"event_statuses"
  WHEN "status"::text = 'published' THEN 'published'::"event_statuses"
  WHEN "status"::text = 'archived' THEN 'completed'::"event_statuses"
  ELSE 'published'::"event_statuses"
END;
ALTER TABLE "events" DROP COLUMN "status";
ALTER TABLE "events" RENAME COLUMN "status_new" TO "status";

-- AlterTable events: add new fields
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "venueName" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "zipCode" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS "shortDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "difficulty" TEXT,
  ADD COLUMN IF NOT EXISTS "isVirtual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "virtualPlatform" TEXT,
  ADD COLUMN IF NOT EXISTS "virtualUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "startTime" TEXT,
  ADD COLUMN IF NOT EXISTS "endTime" TEXT,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT,
  ADD COLUMN IF NOT EXISTS "isAllDay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "commentCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rsvpCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "importSource" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT;

-- CreateIndex on events for import tracking
CREATE INDEX IF NOT EXISTS "events_importSource_externalId_idx" ON "events"("importSource", "externalId");

-- CreateTable: user_event_preferences
CREATE TABLE IF NOT EXISTS "user_event_preferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "homeLatitude" DECIMAL(10,7),
  "homeLongitude" DECIMAL(10,7),
  "searchRadius" INTEGER NOT NULL DEFAULT 100,
  "followedTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "newEventAlerts" BOOLEAN NOT NULL DEFAULT true,
  "reminderDays" INTEGER NOT NULL DEFAULT 3,
  "resultsAlerts" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "user_event_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for user_event_preferences
CREATE UNIQUE INDEX IF NOT EXISTS "user_event_preferences_userId_key" ON "user_event_preferences"("userId");

-- AddForeignKey for user_event_preferences
ALTER TABLE "user_event_preferences"
  ADD CONSTRAINT "user_event_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
