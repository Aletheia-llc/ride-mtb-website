-- AlterTable: add postId and commentId to credit_tips
ALTER TABLE "public"."credit_tips" ADD COLUMN IF NOT EXISTS "postId" TEXT;
ALTER TABLE "public"."credit_tips" ADD COLUMN IF NOT EXISTS "commentId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."credit_tips" ADD CONSTRAINT "credit_tips_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "public"."posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."credit_tips" ADD CONSTRAINT "credit_tips_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "public"."comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "credit_tips_postId_idx" ON "public"."credit_tips"("postId");
CREATE INDEX IF NOT EXISTS "credit_tips_commentId_idx" ON "public"."credit_tips"("commentId");

-- Also add TIP_SENT and TIP_RECEIVED to enum if not present
DO $$ BEGIN
  ALTER TYPE "CreditTransactionType" ADD VALUE IF NOT EXISTS 'TIP_SENT';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "CreditTransactionType" ADD VALUE IF NOT EXISTS 'TIP_RECEIVED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
