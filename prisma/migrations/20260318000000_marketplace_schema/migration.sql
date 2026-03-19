-- NOTE: FulfillmentType and ListingCategory were partially applied in a prior attempt.
-- This script continues from the current DB state.

-- CreateEnum (already exists from partial run, kept for reference)
-- CREATE TYPE "FulfillmentType" AS ENUM ('local_only', 'ship_only', 'local_or_ship');

-- AlterEnum: ListingCategory already updated in partial run.

-- AlterEnum: Add pending_review and cancelled to ListingStatus
ALTER TYPE "ListingStatus" ADD VALUE 'pending_review';
ALTER TYPE "ListingStatus" ADD VALUE 'cancelled';

-- DropForeignKey
ALTER TABLE "listing_favorites" DROP CONSTRAINT "listing_favorites_listingId_fkey";
ALTER TABLE "listing_favorites" DROP CONSTRAINT "listing_favorites_userId_fkey";
ALTER TABLE "listing_payments" DROP CONSTRAINT "listing_payments_listingId_fkey";
ALTER TABLE "listing_payments" DROP CONSTRAINT "listing_payments_userId_fkey";

-- AlterTable: listings — drop imageUrls, add new fields
ALTER TABLE "listings" DROP COLUMN "imageUrls",
ADD COLUMN     "bumpedAt" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'US',
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "estimatedWeight" DOUBLE PRECISION,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "forumCrossPostId" TEXT,
ADD COLUMN     "fromGarageBikeId" TEXT,
ADD COLUMN     "fulfillment" "FulfillmentType" NOT NULL DEFAULT 'local_or_ship',
ADD COLUMN     "isBumped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "messageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "packageHeight" INTEGER,
ADD COLUMN     "packageLength" INTEGER,
ADD COLUMN     "packageWidth" INTEGER,
ADD COLUMN     "saveCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingCost" DOUBLE PRECISION,
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "state" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "zipCode" TEXT;

-- Set status default separately (after pending_review enum value committed)
ALTER TABLE "listings" ALTER COLUMN "status" SET DEFAULT 'pending_review';

-- AlterTable: seller_profiles
ALTER TABLE "seller_profiles" ADD COLUMN "avgResponseTime" INTEGER;

-- AlterTable: seller_reviews
ALTER TABLE "seller_reviews" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable: transactions
ALTER TABLE "transactions" ADD COLUMN "paymentIntentId" TEXT;

-- DropTable: listing_favorites, listing_payments
DROP TABLE "listing_favorites";
DROP TABLE "listing_payments";

-- DropEnum
DROP TYPE "listing_payment_status";

-- CreateIndex
CREATE UNIQUE INDEX "transactions_paymentIntentId_key" ON "transactions"("paymentIntentId");
