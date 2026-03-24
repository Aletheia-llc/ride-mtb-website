-- DropForeignKey
ALTER TABLE "trail_reviews" DROP CONSTRAINT "trail_reviews_trailId_fkey";

-- DropIndex
DROP INDEX "votes_user_comment_unique";

-- DropIndex
DROP INDEX "votes_user_post_unique";

-- AlterTable
ALTER TABLE "trails" ALTER COLUMN "features" SET DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "trail_reviews" ADD CONSTRAINT "trail_reviews_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

