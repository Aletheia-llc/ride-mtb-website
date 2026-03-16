-- DropForeignKey
ALTER TABLE "forum_bookmarks" DROP CONSTRAINT "forum_bookmarks_threadId_fkey";

-- DropForeignKey
ALTER TABLE "forum_bookmarks" DROP CONSTRAINT "forum_bookmarks_userId_fkey";

-- DropForeignKey
ALTER TABLE "forum_categories" DROP CONSTRAINT "forum_categories_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "forum_community_memberships" DROP CONSTRAINT "forum_community_memberships_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "forum_community_memberships" DROP CONSTRAINT "forum_community_memberships_userId_fkey";

-- DropForeignKey
ALTER TABLE "forum_notifications" DROP CONSTRAINT "forum_notifications_postId_fkey";

-- DropForeignKey
ALTER TABLE "forum_notifications" DROP CONSTRAINT "forum_notifications_threadId_fkey";

-- DropForeignKey
ALTER TABLE "forum_posts" DROP CONSTRAINT "forum_posts_authorId_fkey";

-- DropForeignKey
ALTER TABLE "forum_posts" DROP CONSTRAINT "forum_posts_parentId_fkey";

-- DropForeignKey
ALTER TABLE "forum_posts" DROP CONSTRAINT "forum_posts_threadId_fkey";

-- DropForeignKey
ALTER TABLE "forum_reports" DROP CONSTRAINT "forum_reports_moderatorId_fkey";

-- DropForeignKey
ALTER TABLE "forum_reports" DROP CONSTRAINT "forum_reports_postId_fkey";

-- DropForeignKey
ALTER TABLE "forum_reports" DROP CONSTRAINT "forum_reports_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "forum_reports" DROP CONSTRAINT "forum_reports_threadId_fkey";

-- DropForeignKey
ALTER TABLE "forum_thread_tags" DROP CONSTRAINT "forum_thread_tags_tagId_fkey";

-- DropForeignKey
ALTER TABLE "forum_thread_tags" DROP CONSTRAINT "forum_thread_tags_threadId_fkey";

-- DropForeignKey
ALTER TABLE "forum_threads" DROP CONSTRAINT "forum_threads_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "forum_user_badges" DROP CONSTRAINT "forum_user_badges_badgeSlug_fkey";

-- DropForeignKey
ALTER TABLE "forum_user_badges" DROP CONSTRAINT "forum_user_badges_userId_fkey";

-- DropForeignKey
ALTER TABLE "forum_votes" DROP CONSTRAINT "forum_votes_postId_fkey";

-- DropForeignKey
ALTER TABLE "forum_votes" DROP CONSTRAINT "forum_votes_userId_fkey";

-- DropIndex
DROP INDEX "forum_notifications_actorId_type_postId_idx";

-- ── Backup forum_notifications FK values before column rename ──────────────
ALTER TABLE "forum_notifications" ADD COLUMN "_tmp_thread_id" TEXT;
ALTER TABLE "forum_notifications" ADD COLUMN "_tmp_post_id" TEXT;
UPDATE "forum_notifications" SET "_tmp_thread_id" = "threadId", "_tmp_post_id" = "postId";

-- AlterTable
ALTER TABLE "forum_notifications" DROP COLUMN "threadId",
ADD COLUMN     "commentId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerifiedCreator" BOOLEAN NOT NULL DEFAULT false;

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
CREATE TABLE "link_previews" (
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_previews_pkey" PRIMARY KEY ("url")
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
CREATE INDEX "forum_notifications_actorId_type_commentId_idx" ON "forum_notifications"("actorId", "type", "commentId");

-- ════════════════════════════════════════════════════════════════════════════
-- DATA MIGRATION: Forum-prefixed → new models
-- All IDs are preserved (same cuid values), so FK references remain valid.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Restore forum_notifications with new column names (backup was done above)
UPDATE "forum_notifications" SET "postId" = "_tmp_thread_id", "commentId" = "_tmp_post_id";
ALTER TABLE "forum_notifications" DROP COLUMN "_tmp_thread_id";
ALTER TABLE "forum_notifications" DROP COLUMN "_tmp_post_id";

-- 2. Categories (direct copy — same fields)
INSERT INTO "categories" (id, name, slug, description, icon, color, "sortOrder", "isGated", "ownerId", "coverImageUrl", "memberCount")
SELECT id, name, slug, description, icon, color, "sortOrder", "isGated", "ownerId", "coverImageUrl", "memberCount"
FROM "forum_categories";

-- 3. Link previews (direct copy)
INSERT INTO "link_previews" (url, title, description, "imageUrl", "fetchedAt")
SELECT url, title, description, "imageUrl", "fetchedAt"
FROM "forum_link_previews";

-- 4. Posts (ForumThread + first ForumPost for authorId + body)
INSERT INTO "posts" (
  id, title, slug, body, "authorId", "categoryId",
  "voteScore", "hotScore", "commentCount", "viewCount",
  "isPinned", "isLocked", "isCreatorPost",
  "editedAt", "editedById", "lastReplyAt", "lastReplyById",
  "linkPreviewUrl", "deletedAt", "createdAt", "updatedAt"
)
SELECT
  ft.id,
  ft.title,
  ft.slug,
  fp.content,
  fp."authorId",
  ft."categoryId",
  ft."voteScore",
  ft."hotScore",
  (SELECT COUNT(*)::int FROM "forum_posts" WHERE "threadId" = ft.id AND "isFirst" = false AND "deletedAt" IS NULL),
  ft."viewCount",
  ft."isPinned",
  ft."isLocked",
  false,
  fp."editedAt",
  NULL,
  ft."lastReplyAt",
  NULL,
  ft."linkPreviewUrl",
  ft."deletedAt",
  ft."createdAt",
  ft."updatedAt"
FROM "forum_threads" ft
JOIN "forum_posts" fp ON fp."threadId" = ft.id AND fp."isFirst" = true;

-- 5. Comments (ForumPost where isFirst=false)
INSERT INTO "comments" (
  id, body, "postId", "authorId", "parentId",
  "voteScore", "editedAt", "editedById", "deletedAt", "createdAt", "updatedAt"
)
SELECT
  fp.id,
  fp.content,
  fp."threadId",
  fp."authorId",
  fp."parentId",
  COALESCE((SELECT SUM(value)::int FROM "forum_votes" WHERE "postId" = fp.id), 0),
  fp."editedAt",
  NULL,
  fp."deletedAt",
  fp."createdAt",
  fp."updatedAt"
FROM "forum_posts" fp
WHERE fp."isFirst" = false;

-- 6. Votes — OP post votes → Vote.postId (forum_votes has no createdAt; use NOW())
INSERT INTO "votes" (id, "userId", "postId", "commentId", value, "createdAt")
SELECT fv.id, fv."userId", fp."threadId", NULL, fv.value, NOW()
FROM "forum_votes" fv
JOIN "forum_posts" fp ON fp.id = fv."postId" AND fp."isFirst" = true;

-- Reply votes → Vote.commentId
INSERT INTO "votes" (id, "userId", "postId", "commentId", value, "createdAt")
SELECT fv.id, fv."userId", NULL, fv."postId", fv.value, NOW()
FROM "forum_votes" fv
JOIN "forum_posts" fp ON fp.id = fv."postId" AND fp."isFirst" = false;

-- 7. Bookmarks — threadId IS Post.id (same cuid)
INSERT INTO "bookmarks" (id, "userId", "postId", "createdAt")
SELECT id, "userId", "threadId", "createdAt"
FROM "forum_bookmarks";

-- 8. Tags
INSERT INTO "tags" (id, name, slug, color)
SELECT id, name, slug, color
FROM "forum_tags";

-- 9. PostTags — threadId IS Post.id
INSERT INTO "post_tags" ("postId", "tagId")
SELECT "threadId", "tagId"
FROM "forum_thread_tags";

-- 10. Badges (note: ForumBadge has slug and name as separate fields)
INSERT INTO "badges" (id, name, slug, description, icon, color, "createdAt")
SELECT id, name, slug, description, icon, color, "createdAt"
FROM "forum_badges";

-- 11. UserBadges — join on slug to get new badge.id
INSERT INTO "user_badges" (id, "userId", "badgeId", "awardedAt")
SELECT fub.id, fub."userId", b.id, fub."awardedAt"
FROM "forum_user_badges" fub
JOIN "badges" b ON b.slug = fub."badgeSlug";

-- 12. Reports — map targetType + remap threadId/postId to postId/commentId
INSERT INTO "reports" (
  id, "reporterId", "reportedUserId", "postId", "commentId",
  reason, status, "moderatorId", "modNote", "resolvedAt", "createdAt"
)
SELECT
  fr.id,
  fr."reporterId",
  fr."reportedUserId",
  CASE WHEN fr."targetType" = 'THREAD' THEN fr."threadId" ELSE NULL END,
  CASE WHEN fr."targetType" = 'POST'   THEN fr."postId"   ELSE NULL END,
  fr.reason,
  LOWER(fr.status::text),
  fr."moderatorId",
  fr."modNote",
  fr."resolvedAt",
  fr."createdAt"
FROM "forum_reports" fr;

-- 13. CommunityMemberships (direct copy)
INSERT INTO "community_memberships" (id, "userId", "categoryId", role, "createdAt")
SELECT id, "userId", "categoryId", role, "createdAt"
FROM "forum_community_memberships";

-- DropTable
DROP TABLE "forum_badges";

-- DropTable
DROP TABLE "forum_bookmarks";

-- DropTable
DROP TABLE "forum_categories";

-- DropTable
DROP TABLE "forum_community_memberships";

-- DropTable
DROP TABLE "forum_link_previews";

-- DropTable
DROP TABLE "forum_posts";

-- DropTable
DROP TABLE "forum_reports";

-- DropTable
DROP TABLE "forum_tags";

-- DropTable
DROP TABLE "forum_thread_tags";

-- DropTable
DROP TABLE "forum_threads";

-- DropTable
DROP TABLE "forum_user_badges";

-- DropTable
DROP TABLE "forum_votes";

-- DropEnum
DROP TYPE "ForumReportStatus";

-- DropEnum
DROP TYPE "ForumReportTarget";

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
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_notifications" ADD CONSTRAINT "forum_notifications_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 14. Partial unique indexes for Vote (NULL-safe uniqueness)
CREATE UNIQUE INDEX "votes_user_post_unique"    ON "votes" ("userId", "postId")    WHERE "postId"    IS NOT NULL;
CREATE UNIQUE INDEX "votes_user_comment_unique" ON "votes" ("userId", "commentId") WHERE "commentId" IS NOT NULL;
