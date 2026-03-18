-- Rename Fantasy EventStatus enum to FantasyEventStatus in Prisma schema only.
-- The @@map("EventStatus") directive means the DB type name stays "EventStatus" — no DB change needed.
-- EventTypeEnum and Event.eventTypeEnum were never migrated to the DB, so no DROP is needed.
-- This migration is intentionally a no-op at the DB level.
SELECT 1;
