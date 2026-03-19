-- Migration: fix Transaction model - remove duplicate paymentIntentId, add @unique to stripePaymentIntentId

-- Drop the unique index on the old paymentIntentId column
DROP INDEX IF EXISTS "transactions_paymentIntentId_key";

-- Drop the paymentIntentId column
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "paymentIntentId";

-- Add unique constraint to stripePaymentIntentId
CREATE UNIQUE INDEX "transactions_stripePaymentIntentId_key" ON "transactions"("stripePaymentIntentId");
