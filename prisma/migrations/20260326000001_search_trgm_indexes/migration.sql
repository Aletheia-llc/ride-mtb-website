-- Enable the pg_trgm extension (already available on Supabase by default)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes for forum post search (title, body)
CREATE INDEX IF NOT EXISTS "posts_title_trgm_idx" ON "posts" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "posts_body_trgm_idx" ON "posts" USING GIN (body gin_trgm_ops);

-- GIN trigram indexes for marketplace listing search (title, description, brand, modelName)
CREATE INDEX IF NOT EXISTS "listings_title_trgm_idx" ON "listings" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "listings_description_trgm_idx" ON "listings" USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "listings_brand_trgm_idx" ON "listings" USING GIN (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "listings_model_name_trgm_idx" ON "listings" USING GIN ("modelName" gin_trgm_ops);

-- GIN trigram indexes for user search (username, name)
CREATE INDEX IF NOT EXISTS "users_username_trgm_idx" ON "users" USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_name_trgm_idx" ON "users" USING GIN (name gin_trgm_ops);
