-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BikeComponentCategory" AS ENUM ('FRAME', 'FORK', 'SHOCK', 'WHEELS', 'DRIVETRAIN', 'BRAKES', 'COCKPIT', 'SEATPOST', 'SADDLE', 'PEDALS', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceInterval" AS ENUM ('MILES', 'DAYS', 'HOURS');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('pending', 'accepted', 'declined', 'countered', 'withdrawn', 'expired');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending_payment', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('accepting_submissions', 'voting', 'closed', 'winner_announced', 'in_production', 'completed');

-- CreateEnum
CREATE TYPE "ShopType" AS ENUM ('LOCAL_SHOP', 'CHAIN_STORE', 'ONLINE_RETAILER', 'RENTAL_SHOP', 'REPAIR_ONLY', 'SUSPENSION_SPECIALIST', 'WHEEL_BUILDER', 'CUSTOM_BUILDER', 'DEMO_CENTER', 'GUIDE_SERVICE', 'COACHING', 'TRAIL_ADVOCACY', 'OTHER');

-- CreateEnum
CREATE TYPE "PartnerTier" AS ENUM ('NONE', 'VERIFIED', 'PARTNER', 'PREMIER');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'instructor', 'admin');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "event_statuses" AS ENUM ('draft', 'pending_review', 'published', 'cancelled', 'postponed', 'completed');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('gold', 'silver', 'bronze', 'incomplete');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('multiple_choice', 'true_false', 'image_based', 'drag_drop', 'diagram_match', 'hotspot');

-- CreateEnum
CREATE TYPE "LearnCategory" AS ENUM ('riding_skills', 'maintenance', 'fitness', 'etiquette', 'nutrition', 'gear');

-- CreateEnum
CREATE TYPE "XpModule" AS ENUM ('forum', 'learn', 'trails', 'bikes', 'events', 'reviews', 'rides', 'marketplace', 'merch', 'shops', 'media', 'coaching', 'fantasy');

-- CreateEnum
CREATE TYPE "XpEvent" AS ENUM ('forum_post_created', 'forum_thread_created', 'forum_vote_received', 'learn_quiz_completed', 'learn_quiz_improved', 'learn_module_completed', 'learn_course_completed', 'trail_review_submitted', 'trail_condition_reported', 'trail_photo_uploaded', 'trail_gpx_contributed', 'ride_logged', 'review_submitted', 'event_attended', 'event_created', 'streak_bonus', 'listing_created', 'listing_favorited', 'bike_quiz_completed', 'fantasy_team_scored', 'fantasy_top_10_pct', 'fantasy_season_completed', 'fantasy_league_won');

-- CreateEnum
CREATE TYPE "TrailSystemType" AS ENUM ('bike_park', 'trail_network', 'open_space', 'private_property', 'urban_park', 'skills_park', 'other');

-- CreateEnum
CREATE TYPE "TrailType" AS ENUM ('xc', 'downhill', 'enduro', 'flow', 'freeride', 'climbing', 'connector', 'out_and_back', 'loop', 'shuttle', 'pump_track', 'skills_area', 'other');

-- CreateEnum
CREATE TYPE "TrailStatus" AS ENUM ('pending', 'open', 'closed_seasonal', 'closed_conditions', 'closed_construction', 'closed_permanent', 'unknown');

-- CreateEnum
CREATE TYPE "TrailCondition" AS ENUM ('dry_fast', 'dry_dusty', 'tacky_perfect', 'damp', 'muddy', 'snow_ice', 'flooded', 'fallen_trees', 'construction');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('DRY', 'TACKY', 'HERO_DIRT', 'DUSTY', 'MUDDY', 'WET', 'SOFT', 'SNOWY', 'ICY', 'CLOSED');

-- CreateEnum
CREATE TYPE "PoiType" AS ENUM ('TRAILHEAD', 'PARKING', 'WATER', 'RESTROOM', 'VIEWPOINT', 'FEATURE', 'HAZARD', 'SHUTTLE_STOP');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('group_ride', 'race', 'skills_clinic', 'trail_work', 'social', 'demo_day', 'other');

-- CreateEnum
CREATE TYPE "EventTypeEnum" AS ENUM ('RACE', 'ENDURO', 'DOWNHILL', 'CROSS_COUNTRY', 'TRAIL_RIDE', 'GROUP_RIDE', 'SKILLS_CLINIC', 'KIDS_CAMP', 'BIKEPACKING', 'FUNDRAISER', 'SOCIAL', 'FESTIVAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('going', 'maybe', 'not_going');

-- CreateEnum
CREATE TYPE "GearCategory" AS ENUM ('bikes', 'helmets', 'protection', 'shoes', 'clothing', 'wheels', 'suspension', 'drivetrain', 'brakes', 'cockpit', 'accessories', 'tools', 'other');

-- CreateEnum
CREATE TYPE "BikeCategory" AS ENUM ('gravel', 'xc', 'trail', 'enduro', 'downhill', 'dirt_jump', 'ebike', 'other');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('photo', 'video');

-- CreateEnum
CREATE TYPE "ListingCategory" AS ENUM ('complete_bike', 'frame', 'fork', 'shock', 'wheels', 'tires', 'drivetrain', 'brakes', 'cockpit', 'saddle_seatpost', 'pedals', 'dropper_post', 'helmet', 'goggles_eyewear', 'clothing', 'pack_hydration', 'tools', 'electronics', 'protection', 'rack_transport', 'vehicle', 'other');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('new', 'like_new', 'good', 'fair', 'poor');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'pending_review', 'active', 'sold', 'reserved', 'expired', 'removed', 'cancelled');

-- CreateEnum
CREATE TYPE "MerchCategory" AS ENUM ('apparel', 'headwear', 'accessories', 'stickers', 'drinkware', 'other');

-- CreateEnum
CREATE TYPE "ForumNotificationType" AS ENUM ('REPLY_TO_THREAD', 'REPLY_TO_POST', 'MENTION', 'VOTE_MILESTONE');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('EARNED', 'TIP_SENT', 'TIP_RECEIVED', 'PURCHASE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CreatorStatus" AS ENUM ('invited', 'onboarding', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('queued', 'processing', 'transcoding', 'pending_review', 'live', 'rejected');

-- CreateEnum
CREATE TYPE "VideoCategory" AS ENUM ('riding_skills', 'maintenance', 'fitness', 'gear', 'trails', 'other');

-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('ai', 'manual');

-- CreateEnum
CREATE TYPE "AdCampaignStatus" AS ENUM ('active', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ImpressionStatus" AS ENUM ('pending', 'confirmed', 'skipped');

-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('earning', 'payout');

-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "article_category" AS ENUM ('news', 'gear_review', 'trail_spotlight', 'how_to', 'culture');

-- CreateEnum
CREATE TYPE "listing_payment_status" AS ENUM ('pending', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "affiliate_link_type" AS ENUM ('shop_directory', 'bike_selector', 'external');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('dh', 'ews', 'xc');

-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('upcoming', 'active', 'completed');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('upcoming', 'roster_open', 'locked', 'results_pending', 'scored');

-- CreateEnum
CREATE TYPE "PassStatus" AS ENUM ('active', 'refunded');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('pending', 'scraped', 'confirmed', 'scored', 'override_pending');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "username" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "karma" INTEGER NOT NULL DEFAULT 0,
    "creditSeed" INTEGER NOT NULL DEFAULT 500,
    "creditPurchased" INTEGER NOT NULL DEFAULT 0,
    "creditEarned" INTEGER NOT NULL DEFAULT 0,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "bannedAt" TIMESTAMP(3),
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "onboardingCompletedAt" TIMESTAMP(3),
    "location" TEXT,
    "ridingStyle" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillLevel" "SkillLevel",
    "favoriteBike" TEXT,
    "favoriteTrail" TEXT,
    "yearsRiding" INTEGER,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMP(3),
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isVerifiedCreator" BOOLEAN NOT NULL DEFAULT false,
    "coverUrl" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "event" "XpEvent" NOT NULL,
    "module" "XpModule" NOT NULL,
    "points" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "total" INTEGER NOT NULL,
    "refId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_aggregates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "moduleBreakdown" JSONB NOT NULL DEFAULT '{}',
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastGrantAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xp_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isGated" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "coverImageUrl" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "voteScore" INTEGER NOT NULL DEFAULT 0,
    "hotScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isCreatorPost" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "editedById" TEXT,
    "lastReplyAt" TIMESTAMP(3),
    "lastReplyById" TEXT,
    "linkPreviewUrl" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "voteScore" INTEGER NOT NULL DEFAULT 0,
    "editedAt" TIMESTAMP(3),
    "editedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "postId" TEXT,
    "commentId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "moderatorId" TEXT,
    "modNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_previews" (
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_previews_pkey" PRIMARY KEY ("url")
);

-- CreateTable
CREATE TABLE "forum_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "ForumNotificationType" NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "meta" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'beginner',
    "category" "LearnCategory" NOT NULL DEFAULT 'riding_skills',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "sponsorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learn_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lessonContent" JSONB,
    "youtubeVideoId" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learn_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_quizzes" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'beginner',
    "category" "LearnCategory" NOT NULL DEFAULT 'riding_skills',
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learn_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptImageUrl" TEXT,
    "options" JSONB NOT NULL,
    "explanation" TEXT,
    "interactiveConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learn_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_quiz_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "tier" "Tier" NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learn_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "bestTier" "Tier" NOT NULL,

    CONSTRAINT "learn_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_certificates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfUrl" TEXT,

    CONSTRAINT "learn_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learn_chat_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learn_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trail_systems" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "websiteUrl" TEXT,
    "systemType" "TrailSystemType" NOT NULL DEFAULT 'trail_network',
    "status" "TrailStatus" NOT NULL DEFAULT 'open',
    "totalMiles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trailCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "regionId" TEXT,
    "coverImageUrl" TEXT,
    "phone" TEXT,
    "trailheadLat" DOUBLE PRECISION,
    "trailheadLng" DOUBLE PRECISION,
    "trailheadNotes" TEXT,
    "parkingInfo" TEXT,
    "seasonalNotes" TEXT,
    "passRequired" BOOLEAN NOT NULL DEFAULT false,
    "dogFriendly" BOOLEAN NOT NULL DEFAULT true,
    "eMtbAllowed" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "totalVertFt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "rideCount" INTEGER NOT NULL DEFAULT 0,
    "importSource" TEXT,
    "externalId" TEXT,
    "submittedByUserId" TEXT,

    CONSTRAINT "trail_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trails" (
    "id" TEXT NOT NULL,
    "trailSystemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "trailType" "TrailType" NOT NULL DEFAULT 'xc',
    "physicalDifficulty" INTEGER NOT NULL DEFAULT 1,
    "technicalDifficulty" INTEGER NOT NULL DEFAULT 1,
    "distance" DOUBLE PRECISION,
    "elevationGain" DOUBLE PRECISION,
    "elevationLoss" DOUBLE PRECISION,
    "highPoint" DOUBLE PRECISION,
    "lowPoint" DOUBLE PRECISION,
    "status" "TrailStatus" NOT NULL DEFAULT 'open',
    "condition" "TrailCondition",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentCondition" "ConditionType",
    "conditionReportedAt" TIMESTAMP(3),
    "difficultyLabel" TEXT,
    "hasGpsTrack" BOOLEAN NOT NULL DEFAULT false,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "surfaceType" TEXT,
    "direction" TEXT,
    "averageRating" DOUBLE PRECISION,
    "avgFlowRating" DOUBLE PRECISION,
    "avgSceneryRating" DOUBLE PRECISION,
    "avgTechnicalRating" DOUBLE PRECISION,
    "avgMaintenanceRating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "rideCount" INTEGER NOT NULL DEFAULT 0,
    "lastRiddenAt" TIMESTAMP(3),
    "avgRideSpeedMph" DOUBLE PRECISION,
    "avgRideDurationMin" DOUBLE PRECISION,
    "gpsContributionCount" INTEGER NOT NULL DEFAULT 0,
    "importSource" TEXT,
    "externalId" TEXT,
    "submittedByUserId" TEXT,

    CONSTRAINT "trails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trail_gps_tracks" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "gpxFileUrl" TEXT,
    "boundsNeLat" DOUBLE PRECISION,
    "boundsNeLng" DOUBLE PRECISION,
    "boundsSwLat" DOUBLE PRECISION,
    "boundsSwLng" DOUBLE PRECISION,
    "pointCount" INTEGER NOT NULL DEFAULT 0,
    "trackData" TEXT,
    "elevationProfile" TEXT,
    "contributorCount" INTEGER NOT NULL DEFAULT 1,
    "boundsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trail_gps_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trail_reviews" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "flowRating" INTEGER,
    "sceneryRating" INTEGER,
    "technicalRating" INTEGER,
    "maintenanceRating" INTEGER,
    "comment" TEXT,
    "rideDate" TIMESTAMP(3),
    "bikeType" TEXT,
    "title" TEXT,
    "body" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trail_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trail_favorites" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trail_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trailId" TEXT,
    "trailSystemId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condition_reports" (
    "id" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "condition" "ConditionType" NOT NULL,
    "notes" VARCHAR(500),
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "condition_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_of_interest" (
    "id" TEXT NOT NULL,
    "trailId" TEXT,
    "trailSystemId" TEXT,
    "type" "PoiType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "distanceAlongMi" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "videoUrl" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "submittedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_of_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trail_regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "coverImageUrl" TEXT,
    "boundsNeLat" DOUBLE PRECISION,
    "boundsNeLng" DOUBLE PRECISION,
    "boundsSwLat" DOUBLE PRECISION,
    "boundsSwLng" DOUBLE PRECISION,
    "trailSystemCount" INTEGER NOT NULL DEFAULT 0,
    "totalTrailCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trail_regions_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "maxAttendees" INTEGER,
    "imageUrl" TEXT,
    "eventType" "EventType" NOT NULL DEFAULT 'group_ride',
    "status" "event_statuses" NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventTypeEnum" "EventTypeEnum",
    "organizerId" TEXT,
    "registrationUrl" TEXT,
    "registrationDeadline" TIMESTAMP(3),
    "costCents" INTEGER,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "resultsUrl" TEXT,
    "resultsPosted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_comments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "bio" TEXT,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvps" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL DEFAULT 'going',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "GearCategory" NOT NULL,
    "brand" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "pros" TEXT,
    "cons" TEXT,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gear_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bikes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "category" "BikeCategory" NOT NULL,
    "wheelSize" TEXT,
    "frameSize" TEXT,
    "weight" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "frameMaterial" TEXT,
    "travel" INTEGER,
    "purchaseYear" INTEGER,
    "purchasePrice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_bikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_service_logs" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "cost" DOUBLE PRECISION,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "mileage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bike_service_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_components" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "category" "BikeComponentCategory" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "weightGrams" INTEGER,
    "priceCents" INTEGER,
    "notes" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bike_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_log_entries" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "build_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_tasks" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "intervalType" "MaintenanceInterval" NOT NULL,
    "intervalValue" INTEGER NOT NULL,
    "lastCompletedAt" TIMESTAMP(3),
    "lastMileage" INTEGER,
    "isDue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "title" TEXT,
    "description" TEXT,
    "trailId" TEXT,
    "rideLogId" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "category" "ListingCategory" NOT NULL,
    "condition" "ItemCondition" NOT NULL,
    "location" TEXT,
    "imageUrls" JSONB NOT NULL DEFAULT '[]',
    "status" "ListingStatus" NOT NULL DEFAULT 'active',
    "brand" TEXT,
    "modelName" TEXT,
    "year" INTEGER,
    "acceptsOffers" BOOLEAN NOT NULL DEFAULT true,
    "minOfferPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_photos" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'pending',
    "parentOfferId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_conversations" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "buyerUnread" INTEGER NOT NULL DEFAULT 0,
    "sellerUnread" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellerPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCharged" DOUBLE PRECISION NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "trackingNumber" TEXT,
    "trackingCarrier" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending_payment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeAccountId" TEXT,
    "stripeOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_reviews" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "listingId" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_saves" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "listingId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "body" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merch_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "imageUrls" JSONB NOT NULL DEFAULT '[]',
    "category" "MerchCategory" NOT NULL,
    "sizes" JSONB NOT NULL DEFAULT '[]',
    "variants" JSONB NOT NULL DEFAULT '[]',
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'published',
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merch_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL DEFAULT 'default',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limited_drops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "productIds" TEXT[],
    "launchAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "notifySubscribers" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limited_drops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_subscribers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drop_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_contests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "productType" TEXT NOT NULL,
    "submissionStart" TIMESTAMP(3) NOT NULL,
    "submissionEnd" TIMESTAMP(3) NOT NULL,
    "votingStart" TIMESTAMP(3) NOT NULL,
    "votingEnd" TIMESTAMP(3) NOT NULL,
    "status" "ContestStatus" NOT NULL DEFAULT 'accepting_submissions',
    "prizeDescription" TEXT,
    "winnerSubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_submissions" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "mockupUrl" TEXT,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_votes" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "phone" TEXT,
    "email" TEXT,
    "websiteUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "services" JSONB NOT NULL DEFAULT '[]',
    "brands" JSONB NOT NULL DEFAULT '[]',
    "shopType" "ShopType" NOT NULL DEFAULT 'OTHER',
    "partnerTier" "PartnerTier" NOT NULL DEFAULT 'NONE',
    "hoursJson" JSONB,
    "avgOverallRating" DOUBLE PRECISION,
    "avgServiceRating" DOUBLE PRECISION,
    "avgPricingRating" DOUBLE PRECISION,
    "avgSelectionRating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_photos" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_reviews" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "serviceRating" INTEGER NOT NULL,
    "pricingRating" INTEGER NOT NULL,
    "selectionRating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "bikeType" TEXT,
    "ownerResponse" TEXT,
    "ownerResponseAt" TIMESTAMP(3),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_helpful" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "review_helpful_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "specialties" JSONB NOT NULL DEFAULT '[]',
    "hourlyRate" DOUBLE PRECISION,
    "location" TEXT,
    "calcomLink" TEXT,
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "specialties" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "hourlyRate" DOUBLE PRECISION,
    "location" TEXT,
    "calcomLink" TEXT,
    "status" "application_status" NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_tips" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_tips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "answerValue" JSONB NOT NULL,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_results" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "primaryCategory" INTEGER NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "categoryName" TEXT NOT NULL,
    "resultJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_spectrum_categories" (
    "id" TEXT NOT NULL,
    "categoryNumber" INTEGER NOT NULL,
    "categoryName" TEXT NOT NULL,
    "categoryDescription" TEXT NOT NULL,
    "travelRange" TEXT,
    "recommendedWheelConfig" TEXT NOT NULL,
    "recommendedSizes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bike_spectrum_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_brands" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bike_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_brand_models" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "categoryNumber" INTEGER NOT NULL,
    "modelName" TEXT NOT NULL,
    "priceRange" TEXT,
    "productUrl" TEXT,
    "availableSizes" JSONB NOT NULL,
    "keySpecs" JSONB,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bike_brand_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_consultation_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "ridingGoals" TEXT NOT NULL,
    "specificQuestions" TEXT,
    "budgetRange" TEXT,
    "quizSessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bike_consultation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_listings" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "category" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "travel" INTEGER,
    "wheelSize" TEXT NOT NULL,
    "frame" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bike_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "youtubeChannelId" TEXT,
    "revenueSharePct" INTEGER NOT NULL DEFAULT 70,
    "stripeAccountId" TEXT,
    "status" "CreatorStatus" NOT NULL DEFAULT 'onboarding',
    "licensingAttestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_videos" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "bunnyHlsUrl" TEXT,
    "status" "VideoStatus" NOT NULL DEFAULT 'queued',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "category" "VideoCategory" NOT NULL DEFAULT 'other',
    "trailSystemId" TEXT,
    "tagsConfirmedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_video_tags" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" "TagSource" NOT NULL DEFAULT 'ai',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "creator_video_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "advertiserName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "creativeUrl" TEXT NOT NULL,
    "cpmCents" INTEGER NOT NULL,
    "dailyImpressionCap" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'active',
    "categoryFilter" "VideoCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaign_creator_targets" (
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,

    CONSTRAINT "ad_campaign_creator_targets_pkey" PRIMARY KEY ("campaignId","creatorProfileId")
);

-- CreateTable
CREATE TABLE "ad_impressions" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "viewerId" TEXT,
    "status" "ImpressionStatus" NOT NULL DEFAULT 'pending',
    "earningsCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_wallets" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,

    CONSTRAINT "creator_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "impressionId" TEXT,
    "payoutRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'pending',
    "stripeTransferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "claimedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" JSONB NOT NULL DEFAULT '{}',
    "coverImageUrl" TEXT,
    "status" "article_status" NOT NULL DEFAULT 'draft',
    "category" "article_category" NOT NULL DEFAULT 'news',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_payments" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 299,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "listing_payment_status" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "linkType" "affiliate_link_type" NOT NULL DEFAULT 'external',
    "shopId" TEXT,
    "slug" TEXT NOT NULL,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "season" INTEGER NOT NULL,
    "status" "SeriesStatus" NOT NULL DEFAULT 'upcoming',
    "salaryCap" INTEGER NOT NULL DEFAULT 150000000,
    "sensitivityFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fantasy_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_events" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "raceDate" TIMESTAMP(3) NOT NULL,
    "rosterDeadline" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'upcoming',
    "scraperUrl" TEXT NOT NULL,
    "scraperUrlStages" TEXT,
    "forumThreadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fantasy_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "photoUrl" TEXT,
    "uciId" TEXT,
    "gender" "Gender" NOT NULL,
    "disciplines" "Discipline"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manufacturerId" TEXT,

    CONSTRAINT "riders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bike_manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,

    CONSTRAINT "bike_manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_picks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manufacturer_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer_event_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,
    "manufacturerPickId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "riderId" TEXT NOT NULL,
    "riderFinishPosition" INTEGER NOT NULL,

    CONSTRAINT "manufacturer_event_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_event_entries" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "marketPriceCents" INTEGER NOT NULL,
    "ownershipPct" DOUBLE PRECISION,
    "finishPosition" INTEGER,
    "qualifyingPosition" INTEGER,
    "fantasyPoints" INTEGER,
    "bonusPoints" INTEGER,
    "dnsDnf" BOOLEAN NOT NULL DEFAULT false,
    "partialCompletion" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rider_event_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_teams" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,

    CONSTRAINT "fantasy_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_picks" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "isWildcard" BOOLEAN NOT NULL DEFAULT false,
    "priceAtPick" INTEGER NOT NULL,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "fantasy_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_event_scores" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "basePoints" INTEGER NOT NULL DEFAULT 0,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "isDropRound" BOOLEAN NOT NULL DEFAULT false,
    "isOverBudget" BOOLEAN NOT NULL DEFAULT false,
    "manufacturerPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "fantasy_event_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_season_scores" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "eventsPlayed" INTEGER NOT NULL DEFAULT 0,
    "bestEventScore" INTEGER,
    "worstEventScore" INTEGER,
    "rank" INTEGER,

    CONSTRAINT "fantasy_season_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_leagues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "seriesId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isSurvivor" BOOLEAN NOT NULL DEFAULT false,
    "isChampionship" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fantasy_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_league_members" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminatedAt" TIMESTAMP(3),

    CONSTRAINT "fantasy_league_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_pass_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" "PassStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_pass_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mulligan_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPurchased" INTEGER NOT NULL DEFAULT 0,
    "totalUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mulligan_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mulligan_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mulligan_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mulligan_uses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mulligan_uses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_picks" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,

    CONSTRAINT "expert_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_results" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "status" "ResultStatus" NOT NULL DEFAULT 'pending',
    "finishPosition" INTEGER,
    "qualifyingPosition" INTEGER,
    "dnsDnf" BOOLEAN NOT NULL DEFAULT false,
    "partialCompletion" BOOLEAN NOT NULL DEFAULT false,
    "stageResults" JSONB,
    "rawHtmlUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,

    CONSTRAINT "race_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_overrides" (
    "id" TEXT NOT NULL,
    "raceResultId" TEXT NOT NULL,
    "previousPosition" INTEGER,
    "newPosition" INTEGER,
    "previousDnsDnf" BOOLEAN NOT NULL,
    "newDnsDnf" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "overriddenByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "result_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "xp_grants_userId_module_idx" ON "xp_grants"("userId", "module");

-- CreateIndex
CREATE INDEX "xp_grants_userId_createdAt_idx" ON "xp_grants"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_grants_userId_event_refId_key" ON "xp_grants"("userId", "event", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "xp_aggregates_userId_key" ON "xp_aggregates"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_categoryId_idx" ON "posts"("categoryId");

-- CreateIndex
CREATE INDEX "posts_authorId_idx" ON "posts"("authorId");

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt");

-- CreateIndex
CREATE INDEX "posts_hotScore_idx" ON "posts"("hotScore");

-- CreateIndex
CREATE INDEX "posts_voteScore_idx" ON "posts"("voteScore");

-- CreateIndex
CREATE INDEX "posts_deletedAt_idx" ON "posts"("deletedAt");

-- CreateIndex
CREATE INDEX "posts_lastReplyAt_idx" ON "posts"("lastReplyAt");

-- CreateIndex
CREATE INDEX "comments_postId_idx" ON "comments"("postId");

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "votes_userId_idx" ON "votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_userId_postId_key" ON "bookmarks"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "badges_slug_key" ON "badges"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "community_memberships_userId_categoryId_key" ON "community_memberships"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "forum_notifications_userId_read_idx" ON "forum_notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "forum_notifications_userId_createdAt_idx" ON "forum_notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "forum_notifications_actorId_type_commentId_idx" ON "forum_notifications"("actorId", "type", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "learn_courses_slug_key" ON "learn_courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "learn_modules_courseId_slug_key" ON "learn_modules"("courseId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "learn_quizzes_moduleId_key" ON "learn_quizzes"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "learn_quizzes_slug_key" ON "learn_quizzes"("slug");

-- CreateIndex
CREATE INDEX "learn_questions_quizId_sortOrder_idx" ON "learn_questions"("quizId", "sortOrder");

-- CreateIndex
CREATE INDEX "learn_quiz_attempts_userId_quizId_idx" ON "learn_quiz_attempts"("userId", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "learn_progress_userId_quizId_key" ON "learn_progress"("userId", "quizId");

-- CreateIndex
CREATE INDEX "learn_certificates_userId_idx" ON "learn_certificates"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "learn_certificates_userId_courseId_key" ON "learn_certificates"("userId", "courseId");

-- CreateIndex
CREATE INDEX "learn_chat_messages_userId_createdAt_idx" ON "learn_chat_messages"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "trail_systems_slug_key" ON "trail_systems"("slug");

-- CreateIndex
CREATE INDEX "trail_systems_city_state_idx" ON "trail_systems"("city", "state");

-- CreateIndex
CREATE INDEX "trail_systems_latitude_longitude_idx" ON "trail_systems"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "trails_slug_key" ON "trails"("slug");

-- CreateIndex
CREATE INDEX "trails_trailSystemId_status_idx" ON "trails"("trailSystemId", "status");

-- CreateIndex
CREATE INDEX "trails_trailType_idx" ON "trails"("trailType");

-- CreateIndex
CREATE UNIQUE INDEX "trail_gps_tracks_trailId_key" ON "trail_gps_tracks"("trailId");

-- CreateIndex
CREATE INDEX "trail_reviews_trailId_createdAt_idx" ON "trail_reviews"("trailId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "trail_reviews_trailId_userId_key" ON "trail_reviews"("trailId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "trail_favorites_trailId_userId_key" ON "trail_favorites"("trailId", "userId");

-- CreateIndex
CREATE INDEX "ride_logs_userId_date_idx" ON "ride_logs"("userId", "date");

-- CreateIndex
CREATE INDEX "condition_reports_trailId_reportedAt_idx" ON "condition_reports"("trailId", "reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "trail_regions_slug_key" ON "trail_regions"("slug");

-- CreateIndex
CREATE INDEX "trail_photos_trailId_sortOrder_idx" ON "trail_photos"("trailId", "sortOrder");

-- CreateIndex
CREATE INDEX "trail_system_photos_trailSystemId_sortOrder_idx" ON "trail_system_photos"("trailSystemId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "trail_review_helpful_reviewId_userId_key" ON "trail_review_helpful"("reviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_startDate_idx" ON "events"("startDate");

-- CreateIndex
CREATE INDEX "events_creatorId_idx" ON "events"("creatorId");

-- CreateIndex
CREATE INDEX "event_comments_eventId_createdAt_idx" ON "event_comments"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_profiles_userId_key" ON "organizer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_rsvps_eventId_userId_key" ON "event_rsvps"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "gear_reviews_slug_key" ON "gear_reviews"("slug");

-- CreateIndex
CREATE INDEX "gear_reviews_category_idx" ON "gear_reviews"("category");

-- CreateIndex
CREATE INDEX "gear_reviews_userId_idx" ON "gear_reviews"("userId");

-- CreateIndex
CREATE INDEX "gear_reviews_rating_idx" ON "gear_reviews"("rating");

-- CreateIndex
CREATE INDEX "user_bikes_userId_idx" ON "user_bikes"("userId");

-- CreateIndex
CREATE INDEX "bike_service_logs_bikeId_serviceDate_idx" ON "bike_service_logs"("bikeId", "serviceDate");

-- CreateIndex
CREATE INDEX "bike_components_bikeId_isActive_idx" ON "bike_components"("bikeId", "isActive");

-- CreateIndex
CREATE INDEX "build_log_entries_bikeId_entryDate_idx" ON "build_log_entries"("bikeId", "entryDate");

-- CreateIndex
CREATE INDEX "media_items_userId_createdAt_idx" ON "media_items"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "media_items_trailId_idx" ON "media_items"("trailId");

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_category_status_idx" ON "listings"("category", "status");

-- CreateIndex
CREATE INDEX "listings_sellerId_idx" ON "listings"("sellerId");

-- CreateIndex
CREATE INDEX "listings_createdAt_idx" ON "listings"("createdAt");

-- CreateIndex
CREATE INDEX "listing_favorites_userId_createdAt_idx" ON "listing_favorites"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "listing_favorites_listingId_idx" ON "listing_favorites"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_favorites_userId_listingId_key" ON "listing_favorites"("userId", "listingId");

-- CreateIndex
CREATE INDEX "offers_listingId_status_idx" ON "offers"("listingId", "status");

-- CreateIndex
CREATE INDEX "offers_buyerId_idx" ON "offers"("buyerId");

-- CreateIndex
CREATE INDEX "listing_conversations_buyerId_idx" ON "listing_conversations"("buyerId");

-- CreateIndex
CREATE INDEX "listing_conversations_sellerId_idx" ON "listing_conversations"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_conversations_listingId_buyerId_key" ON "listing_conversations"("listingId", "buyerId");

-- CreateIndex
CREATE INDEX "listing_messages_conversationId_createdAt_idx" ON "listing_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_listingId_key" ON "transactions"("listingId");

-- CreateIndex
CREATE INDEX "transactions_buyerId_idx" ON "transactions"("buyerId");

-- CreateIndex
CREATE INDEX "transactions_sellerId_idx" ON "transactions"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_userId_key" ON "seller_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_reviews_sellerId_reviewerId_listingId_key" ON "seller_reviews"("sellerId", "reviewerId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_saves_userId_listingId_key" ON "listing_saves"("userId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "merch_products_slug_key" ON "merch_products"("slug");

-- CreateIndex
CREATE INDEX "merch_products_category_status_idx" ON "merch_products"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_userId_productId_variantKey_key" ON "cart_items"("userId", "productId", "variantKey");

-- CreateIndex
CREATE UNIQUE INDEX "drop_subscribers_userId_key" ON "drop_subscribers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "design_submissions_contestId_userId_key" ON "design_submissions"("contestId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "design_votes_submissionId_userId_key" ON "design_votes"("submissionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_productId_key" ON "wishlist_items"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- CreateIndex
CREATE INDEX "shops_city_state_idx" ON "shops"("city", "state");

-- CreateIndex
CREATE INDEX "shops_latitude_longitude_idx" ON "shops"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpful_reviewId_userId_key" ON "review_helpful"("reviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_profiles_userId_key" ON "coach_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "coach_applications_userId_key" ON "coach_applications"("userId");

-- CreateIndex
CREATE INDEX "direct_messages_conversationId_createdAt_idx" ON "direct_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_createdAt_idx" ON "credit_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_tips_fromUserId_idx" ON "credit_tips"("fromUserId");

-- CreateIndex
CREATE INDEX "credit_tips_toUserId_idx" ON "credit_tips"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_sessions_sessionToken_key" ON "quiz_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "quiz_sessions_userId_idx" ON "quiz_sessions"("userId");

-- CreateIndex
CREATE INDEX "quiz_sessions_sessionToken_idx" ON "quiz_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "quiz_answers_sessionId_idx" ON "quiz_answers"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_answers_sessionId_stepKey_key" ON "quiz_answers"("sessionId", "stepKey");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_results_sessionId_key" ON "quiz_results"("sessionId");

-- CreateIndex
CREATE INDEX "quiz_results_userId_idx" ON "quiz_results"("userId");

-- CreateIndex
CREATE INDEX "quiz_results_createdAt_idx" ON "quiz_results"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bike_spectrum_categories_categoryNumber_key" ON "bike_spectrum_categories"("categoryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "bike_brands_slug_key" ON "bike_brands"("slug");

-- CreateIndex
CREATE INDEX "bike_brand_models_brandId_idx" ON "bike_brand_models"("brandId");

-- CreateIndex
CREATE INDEX "bike_brand_models_categoryNumber_idx" ON "bike_brand_models"("categoryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "bike_brand_models_brandId_categoryNumber_modelName_key" ON "bike_brand_models"("brandId", "categoryNumber", "modelName");

-- CreateIndex
CREATE INDEX "bike_consultation_requests_userId_idx" ON "bike_consultation_requests"("userId");

-- CreateIndex
CREATE INDEX "bike_consultation_requests_status_idx" ON "bike_consultation_requests"("status");

-- CreateIndex
CREATE INDEX "bike_listings_category_idx" ON "bike_listings"("category");

-- CreateIndex
CREATE INDEX "bike_listings_active_idx" ON "bike_listings"("active");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_userId_key" ON "creator_profiles"("userId");

-- CreateIndex
CREATE INDEX "creator_videos_creatorId_status_idx" ON "creator_videos"("creatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "creator_videos_creatorId_youtubeVideoId_key" ON "creator_videos"("creatorId", "youtubeVideoId");

-- CreateIndex
CREATE INDEX "creator_video_tags_videoId_idx" ON "creator_video_tags"("videoId");

-- CreateIndex
CREATE INDEX "ad_campaigns_status_startDate_endDate_idx" ON "ad_campaigns"("status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ad_impressions_campaignId_status_idx" ON "ad_impressions"("campaignId", "status");

-- CreateIndex
CREATE INDEX "ad_impressions_videoId_idx" ON "ad_impressions"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "creator_wallets_creatorProfileId_key" ON "creator_wallets"("creatorProfileId");

-- CreateIndex
CREATE INDEX "wallet_transactions_creatorId_createdAt_idx" ON "wallet_transactions"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "payout_requests_creatorId_status_idx" ON "payout_requests"("creatorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_tokenHash_key" ON "invite_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_status_publishedAt_idx" ON "articles"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "articles_slug_idx" ON "articles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "listing_payments_listingId_key" ON "listing_payments"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_payments_stripeSessionId_key" ON "listing_payments"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_slug_key" ON "affiliate_links"("slug");

-- CreateIndex
CREATE INDEX "affiliate_clicks_linkId_createdAt_idx" ON "affiliate_clicks"("linkId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_series_discipline_season_key" ON "fantasy_series"("discipline", "season");

-- CreateIndex
CREATE INDEX "fantasy_events_seriesId_raceDate_idx" ON "fantasy_events"("seriesId", "raceDate");

-- CreateIndex
CREATE UNIQUE INDEX "riders_uciId_key" ON "riders"("uciId");

-- CreateIndex
CREATE UNIQUE INDEX "bike_manufacturers_slug_key" ON "bike_manufacturers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturer_picks_userId_seriesId_season_key" ON "manufacturer_picks"("userId", "seriesId", "season");

-- CreateIndex
CREATE INDEX "manufacturer_event_scores_seriesId_season_userId_idx" ON "manufacturer_event_scores"("seriesId", "season", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturer_event_scores_userId_seriesId_season_eventId_key" ON "manufacturer_event_scores"("userId", "seriesId", "season", "eventId");

-- CreateIndex
CREATE INDEX "rider_event_entries_eventId_idx" ON "rider_event_entries"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "rider_event_entries_riderId_eventId_key" ON "rider_event_entries"("riderId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_teams_userId_seriesId_season_key" ON "fantasy_teams"("userId", "seriesId", "season");

-- CreateIndex
CREATE INDEX "fantasy_picks_teamId_eventId_idx" ON "fantasy_picks"("teamId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_picks_teamId_eventId_riderId_key" ON "fantasy_picks"("teamId", "eventId", "riderId");

-- CreateIndex
CREATE INDEX "fantasy_event_scores_eventId_totalPoints_idx" ON "fantasy_event_scores"("eventId", "totalPoints");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_event_scores_teamId_eventId_key" ON "fantasy_event_scores"("teamId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_season_scores_teamId_key" ON "fantasy_season_scores"("teamId");

-- CreateIndex
CREATE INDEX "fantasy_season_scores_seriesId_season_totalPoints_idx" ON "fantasy_season_scores"("seriesId", "season", "totalPoints");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_leagues_inviteCode_key" ON "fantasy_leagues"("inviteCode");

-- CreateIndex
CREATE INDEX "fantasy_leagues_seriesId_season_idx" ON "fantasy_leagues"("seriesId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_league_members_leagueId_userId_key" ON "fantasy_league_members"("leagueId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "season_pass_purchases_stripeSessionId_key" ON "season_pass_purchases"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "season_pass_purchases_userId_seriesId_season_key" ON "season_pass_purchases"("userId", "seriesId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "mulligan_balances_userId_key" ON "mulligan_balances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mulligan_purchases_stripeSessionId_key" ON "mulligan_purchases"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "mulligan_uses_teamId_eventId_key" ON "mulligan_uses"("teamId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "expert_picks_eventId_slot_key" ON "expert_picks"("eventId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "expert_picks_eventId_riderId_key" ON "expert_picks"("eventId", "riderId");

-- CreateIndex
CREATE UNIQUE INDEX "race_results_eventId_riderId_key" ON "race_results"("eventId", "riderId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_grants" ADD CONSTRAINT "xp_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_aggregates" ADD CONSTRAINT "xp_aggregates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_linkPreviewUrl_fkey" FOREIGN KEY ("linkPreviewUrl") REFERENCES "link_previews"("url") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_modules" ADD CONSTRAINT "learn_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "learn_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_quizzes" ADD CONSTRAINT "learn_quizzes_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "learn_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_questions" ADD CONSTRAINT "learn_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "learn_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_quiz_attempts" ADD CONSTRAINT "learn_quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_quiz_attempts" ADD CONSTRAINT "learn_quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "learn_quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_progress" ADD CONSTRAINT "learn_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_progress" ADD CONSTRAINT "learn_progress_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "learn_quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_certificates" ADD CONSTRAINT "learn_certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_certificates" ADD CONSTRAINT "learn_certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "learn_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learn_chat_messages" ADD CONSTRAINT "learn_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_systems" ADD CONSTRAINT "trail_systems_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "trail_regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trails" ADD CONSTRAINT "trails_trailSystemId_fkey" FOREIGN KEY ("trailSystemId") REFERENCES "trail_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_gps_tracks" ADD CONSTRAINT "trail_gps_tracks_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_reviews" ADD CONSTRAINT "trail_reviews_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_reviews" ADD CONSTRAINT "trail_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_favorites" ADD CONSTRAINT "trail_favorites_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_favorites" ADD CONSTRAINT "trail_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_logs" ADD CONSTRAINT "ride_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_logs" ADD CONSTRAINT "ride_logs_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_logs" ADD CONSTRAINT "ride_logs_trailSystemId_fkey" FOREIGN KEY ("trailSystemId") REFERENCES "trail_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_of_interest" ADD CONSTRAINT "points_of_interest_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_of_interest" ADD CONSTRAINT "points_of_interest_trailSystemId_fkey" FOREIGN KEY ("trailSystemId") REFERENCES "trail_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_photos" ADD CONSTRAINT "trail_photos_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_system_photos" ADD CONSTRAINT "trail_system_photos_trailSystemId_fkey" FOREIGN KEY ("trailSystemId") REFERENCES "trail_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_review_helpful" ADD CONSTRAINT "trail_review_helpful_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "trail_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_review_helpful" ADD CONSTRAINT "trail_review_helpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "event_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_profiles" ADD CONSTRAINT "organizer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_reviews" ADD CONSTRAINT "gear_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bikes" ADD CONSTRAINT "user_bikes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bike_service_logs" ADD CONSTRAINT "bike_service_logs_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "user_bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bike_components" ADD CONSTRAINT "bike_components_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "user_bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_log_entries" ADD CONSTRAINT "build_log_entries_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "user_bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_log_entries" ADD CONSTRAINT "build_log_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "user_bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_favorites" ADD CONSTRAINT "listing_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_favorites" ADD CONSTRAINT "listing_favorites_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_parentOfferId_fkey" FOREIGN KEY ("parentOfferId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_conversations" ADD CONSTRAINT "listing_conversations_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_conversations" ADD CONSTRAINT "listing_conversations_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_conversations" ADD CONSTRAINT "listing_conversations_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_messages" ADD CONSTRAINT "listing_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "listing_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_messages" ADD CONSTRAINT "listing_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_saves" ADD CONSTRAINT "listing_saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_saves" ADD CONSTRAINT "listing_saves_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "merch_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_subscribers" ADD CONSTRAINT "drop_subscribers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_submissions" ADD CONSTRAINT "design_submissions_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "design_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_votes" ADD CONSTRAINT "design_votes_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "design_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "merch_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_photos" ADD CONSTRAINT "shop_photos_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "shop_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_applications" ADD CONSTRAINT "coach_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_applications" ADD CONSTRAINT "coach_applications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_tips" ADD CONSTRAINT "credit_tips_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_tips" ADD CONSTRAINT "credit_tips_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bike_brand_models" ADD CONSTRAINT "bike_brand_models_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "bike_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bike_consultation_requests" ADD CONSTRAINT "bike_consultation_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_videos" ADD CONSTRAINT "creator_videos_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_videos" ADD CONSTRAINT "creator_videos_trailSystemId_fkey" FOREIGN KEY ("trailSystemId") REFERENCES "trail_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_video_tags" ADD CONSTRAINT "creator_video_tags_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "creator_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaign_creator_targets" ADD CONSTRAINT "ad_campaign_creator_targets_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaign_creator_targets" ADD CONSTRAINT "ad_campaign_creator_targets_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "creator_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_wallets" ADD CONSTRAINT "creator_wallets_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_impressionId_fkey" FOREIGN KEY ("impressionId") REFERENCES "ad_impressions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "payout_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_payments" ADD CONSTRAINT "listing_payments_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_payments" ADD CONSTRAINT "listing_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_events" ADD CONSTRAINT "fantasy_events_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "fantasy_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "bike_manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_picks" ADD CONSTRAINT "manufacturer_picks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_picks" ADD CONSTRAINT "manufacturer_picks_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "fantasy_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_picks" ADD CONSTRAINT "manufacturer_picks_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "bike_manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_event_scores" ADD CONSTRAINT "manufacturer_event_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_event_scores" ADD CONSTRAINT "manufacturer_event_scores_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "fantasy_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_event_scores" ADD CONSTRAINT "manufacturer_event_scores_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fantasy_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_event_scores" ADD CONSTRAINT "manufacturer_event_scores_manufacturerPickId_fkey" FOREIGN KEY ("manufacturerPickId") REFERENCES "manufacturer_picks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer_event_scores" ADD CONSTRAINT "manufacturer_event_scores_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_event_entries" ADD CONSTRAINT "rider_event_entries_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_event_entries" ADD CONSTRAINT "rider_event_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fantasy_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "fantasy_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_picks" ADD CONSTRAINT "fantasy_picks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_picks" ADD CONSTRAINT "fantasy_picks_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fantasy_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_picks" ADD CONSTRAINT "fantasy_picks_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_event_scores" ADD CONSTRAINT "fantasy_event_scores_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_event_scores" ADD CONSTRAINT "fantasy_event_scores_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fantasy_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_season_scores" ADD CONSTRAINT "fantasy_season_scores_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_season_scores" ADD CONSTRAINT "fantasy_season_scores_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "fantasy_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_leagues" ADD CONSTRAINT "fantasy_leagues_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "fantasy_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_leagues" ADD CONSTRAINT "fantasy_leagues_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_league_members" ADD CONSTRAINT "fantasy_league_members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "fantasy_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_league_members" ADD CONSTRAINT "fantasy_league_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_pass_purchases" ADD CONSTRAINT "season_pass_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_pass_purchases" ADD CONSTRAINT "season_pass_purchases_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "fantasy_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mulligan_balances" ADD CONSTRAINT "mulligan_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mulligan_purchases" ADD CONSTRAINT "mulligan_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mulligan_uses" ADD CONSTRAINT "mulligan_uses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mulligan_uses" ADD CONSTRAINT "mulligan_uses_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mulligan_uses" ADD CONSTRAINT "mulligan_uses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fantasy_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_picks" ADD CONSTRAINT "expert_picks_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fantasy_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_picks" ADD CONSTRAINT "expert_picks_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "fantasy_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_results" ADD CONSTRAINT "race_results_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_overrides" ADD CONSTRAINT "result_overrides_raceResultId_fkey" FOREIGN KEY ("raceResultId") REFERENCES "race_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

