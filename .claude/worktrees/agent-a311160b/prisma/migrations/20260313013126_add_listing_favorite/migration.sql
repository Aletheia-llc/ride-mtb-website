-- AlterEnum
ALTER TYPE "XpEvent" ADD VALUE 'listing_created';
ALTER TYPE "XpEvent" ADD VALUE 'listing_favorited';

-- CreateTable
CREATE TABLE "listing_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listing_favorites_userId_listingId_key" ON "listing_favorites"("userId", "listingId");

-- CreateIndex
CREATE INDEX "listing_favorites_userId_createdAt_idx" ON "listing_favorites"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "listing_favorites_listingId_idx" ON "listing_favorites"("listingId");

-- AddForeignKey
ALTER TABLE "listing_favorites" ADD CONSTRAINT "listing_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_favorites" ADD CONSTRAINT "listing_favorites_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
