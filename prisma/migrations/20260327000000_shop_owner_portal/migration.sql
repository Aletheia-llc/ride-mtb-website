-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'CLAIMED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeadEventType" AS ENUM ('WEBSITE_CLICK', 'PHONE_CLICK', 'DIRECTIONS_CLICK');

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "submittedByUserId" TEXT;

-- CreateTable
CREATE TABLE "shop_claim_requests" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessRole" TEXT NOT NULL,
    "proofDetail" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_claim_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "eventType" "LeadEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_claim_requests_shopId_userId_key" ON "shop_claim_requests"("shopId", "userId");

-- CreateIndex
CREATE INDEX "lead_events_shopId_createdAt_idx" ON "lead_events"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_claim_requests" ADD CONSTRAINT "shop_claim_requests_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_claim_requests" ADD CONSTRAINT "shop_claim_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
