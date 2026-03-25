-- Rename yearsRiding → yearStartedRiding on the users table.
-- The field now stores the actual year the rider started (e.g. 2015)
-- rather than a count of years.
ALTER TABLE "users" RENAME COLUMN "yearsRiding" TO "yearStartedRiding";
