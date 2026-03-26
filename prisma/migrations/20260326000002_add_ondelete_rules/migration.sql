-- Add explicit onDelete rules to relations that were missing them.
-- Most are schema-level clarifications (Restrict is already the DB default),
-- but CASCADE and SET NULL changes require actual constraint modifications.

-- ── Forum ─────────────────────────────────────────────────────────────────────

-- Post.author: Cascade (delete user → delete their posts)
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_authorId_fkey";
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE;

-- Post.category: Restrict (explicit — categories with posts cannot be deleted)
-- (no change needed; Restrict is the DB default, but we make it explicit in schema only)

-- Post.linkPreview: SetNull (delete link preview → clear the link on post)
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_linkPreviewUrl_fkey";
ALTER TABLE "posts" ADD CONSTRAINT "posts_linkPreviewUrl_fkey"
  FOREIGN KEY ("linkPreviewUrl") REFERENCES "link_previews"("url") ON DELETE SET NULL;

-- Comment.author: Cascade (delete user → delete their comments)
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_authorId_fkey";
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE;

-- Comment.parent: SetNull (delete parent comment → replies become top-level)
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_parentId_fkey";
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL;

-- Report.post: SetNull (delete post → keep report but clear post reference)
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_postId_fkey";
ALTER TABLE "reports" ADD CONSTRAINT "reports_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL;

-- Report.comment: SetNull (delete comment → keep report but clear comment reference)
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_commentId_fkey";
ALTER TABLE "reports" ADD CONSTRAINT "reports_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE SET NULL;

-- ── Category ──────────────────────────────────────────────────────────────────

-- Category.owner: SetNull (delete user → category becomes unowned)
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_ownerId_fkey";
ALTER TABLE "categories" ADD CONSTRAINT "categories_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL;

-- ── Learn ─────────────────────────────────────────────────────────────────────

-- LearnQuiz.module: SetNull (delete module → quiz becomes standalone)
ALTER TABLE "learn_quizzes" DROP CONSTRAINT IF EXISTS "learn_quizzes_moduleId_fkey";
ALTER TABLE "learn_quizzes" ADD CONSTRAINT "learn_quizzes_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "learn_modules"("id") ON DELETE SET NULL;

-- LearnQuizAttempt.quiz: Cascade (delete quiz → delete all attempts)
ALTER TABLE "learn_quiz_attempts" DROP CONSTRAINT IF EXISTS "learn_quiz_attempts_quizId_fkey";
ALTER TABLE "learn_quiz_attempts" ADD CONSTRAINT "learn_quiz_attempts_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "learn_quizzes"("id") ON DELETE CASCADE;

-- LearnProgress.quiz: Cascade (delete quiz → delete progress records)
ALTER TABLE "learn_progress" DROP CONSTRAINT IF EXISTS "learn_progress_quizId_fkey";
ALTER TABLE "learn_progress" ADD CONSTRAINT "learn_progress_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "learn_quizzes"("id") ON DELETE CASCADE;

-- LearnCertificate.course: Cascade (delete course → delete certificates)
ALTER TABLE "learn_certificates" DROP CONSTRAINT IF EXISTS "learn_certificates_courseId_fkey";
ALTER TABLE "learn_certificates" ADD CONSTRAINT "learn_certificates_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "learn_courses"("id") ON DELETE CASCADE;

-- ── Trails ────────────────────────────────────────────────────────────────────

-- TrailSystem.region: SetNull (delete region → system becomes unaffiliated)
ALTER TABLE "trail_systems" DROP CONSTRAINT IF EXISTS "trail_systems_regionId_fkey";
ALTER TABLE "trail_systems" ADD CONSTRAINT "trail_systems_regionId_fkey"
  FOREIGN KEY ("regionId") REFERENCES "trail_regions"("id") ON DELETE SET NULL;

-- Trail.system: Cascade (delete system → delete all its trails)
ALTER TABLE "trails" DROP CONSTRAINT IF EXISTS "trails_trailSystemId_fkey";
ALTER TABLE "trails" ADD CONSTRAINT "trails_trailSystemId_fkey"
  FOREIGN KEY ("trailSystemId") REFERENCES "trail_systems"("id") ON DELETE CASCADE;

-- RideLog.trail: SetNull (delete trail → ride log loses trail reference)
ALTER TABLE "ride_logs" DROP CONSTRAINT IF EXISTS "ride_logs_trailId_fkey";
ALTER TABLE "ride_logs" ADD CONSTRAINT "ride_logs_trailId_fkey"
  FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE SET NULL;

-- RideLog.trailSystem: SetNull (delete system → ride log loses system reference)
ALTER TABLE "ride_logs" DROP CONSTRAINT IF EXISTS "ride_logs_trailSystemId_fkey";
ALTER TABLE "ride_logs" ADD CONSTRAINT "ride_logs_trailSystemId_fkey"
  FOREIGN KEY ("trailSystemId") REFERENCES "trail_systems"("id") ON DELETE SET NULL;

-- ── Events ────────────────────────────────────────────────────────────────────

-- Event.organizer: SetNull (delete organizer profile → event becomes unsponsored)
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_organizerId_fkey";
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_fkey"
  FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE SET NULL;

-- EventComment.parent: SetNull (delete parent → replies become top-level)
ALTER TABLE "event_comments" DROP CONSTRAINT IF EXISTS "event_comments_parentId_fkey";
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "event_comments"("id") ON DELETE SET NULL;

-- ── Marketplace ───────────────────────────────────────────────────────────────

-- Listing.seller: Cascade (delete user → delete their listings)
ALTER TABLE "listings" DROP CONSTRAINT IF EXISTS "listings_sellerId_fkey";
ALTER TABLE "listings" ADD CONSTRAINT "listings_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE;

-- Offer.parentOffer: SetNull (delete parent offer → counter-offers become standalone)
ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_parentOfferId_fkey";
ALTER TABLE "offers" ADD CONSTRAINT "offers_parentOfferId_fkey"
  FOREIGN KEY ("parentOfferId") REFERENCES "offers"("id") ON DELETE SET NULL;

-- Transaction.listing: Restrict (explicit — listings with transactions cannot be deleted)
-- (no change needed; Restrict is the DB default)

-- Transaction.buyer/seller: Restrict (explicit — users with transactions cannot be deleted)
-- (no change needed; Restrict is the DB default)

-- ── Shops ─────────────────────────────────────────────────────────────────────

-- Shop.owner: SetNull (delete user → shop becomes unowned)
ALTER TABLE "shops" DROP CONSTRAINT IF EXISTS "shops_ownerId_fkey";
ALTER TABLE "shops" ADD CONSTRAINT "shops_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL;

-- ── Coaching ──────────────────────────────────────────────────────────────────

-- CoachProfile.user: Cascade (delete user → delete their coach profile)
ALTER TABLE "coach_profiles" DROP CONSTRAINT IF EXISTS "coach_profiles_userId_fkey";
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

-- ── Credits ───────────────────────────────────────────────────────────────────

-- CreditTip.fromUser/toUser: Restrict (explicit — users with tip history cannot be deleted)
-- (no change needed; Restrict is the DB default)

-- ── Creator ───────────────────────────────────────────────────────────────────

-- CreatorVideo.trailSystem: SetNull (delete system → video loses system tag)
ALTER TABLE "creator_videos" DROP CONSTRAINT IF EXISTS "creator_videos_trailSystemId_fkey";
ALTER TABLE "creator_videos" ADD CONSTRAINT "creator_videos_trailSystemId_fkey"
  FOREIGN KEY ("trailSystemId") REFERENCES "trail_systems"("id") ON DELETE SET NULL;

-- WalletTransaction.impression: SetNull (delete impression → transaction loses impression ref)
ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "wallet_transactions_impressionId_fkey";
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_impressionId_fkey"
  FOREIGN KEY ("impressionId") REFERENCES "ad_impressions"("id") ON DELETE SET NULL;

-- WalletTransaction.payoutRequest: SetNull (delete payout request → transaction loses ref)
ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "wallet_transactions_payoutRequestId_fkey";
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payoutRequestId_fkey"
  FOREIGN KEY ("payoutRequestId") REFERENCES "payout_requests"("id") ON DELETE SET NULL;
