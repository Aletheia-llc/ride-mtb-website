-- Add index on shop_claim_requests(status, createdAt) for the admin claims queue
CREATE INDEX "shop_claim_requests_status_createdAt_idx" ON "shop_claim_requests"("status", "createdAt");
