-- Rename parks facility tracker tables to snake_case to match @@map directives
ALTER TABLE "Facility" RENAME TO "facilities";
ALTER TABLE "FacilityReview" RENAME TO "facility_reviews";
ALTER TABLE "FacilityPhoto" RENAME TO "facility_photos";
ALTER TABLE "SyncState" RENAME TO "sync_state";
