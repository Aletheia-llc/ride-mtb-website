import 'server-only'
import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOLED_URL: z.string().url(),

  // Auth
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Services
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(20),

  // Cron security
  CRON_SECRET: z.string().min(16),

  // Upstash Redis (rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Optional per-module
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_CALCOM_LINK: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  FANTASY_STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SEASON_PASS_PRICE_ID: z.string().optional(),
  STRIPE_MULLIGAN_1_PRICE_ID: z.string().optional(),
  STRIPE_MULLIGAN_3_PRICE_ID: z.string().optional(),
  BUNNY_CDN_HOSTNAME: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_BUNNY_CDN_HOSTNAME: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  FANTASY_BOT_USER_ID: z.string().optional(),

  // Feature flags
  FEATURE_COACHING: z.enum(['true', 'false']).default('false'),
  FEATURE_MARKETPLACE: z.enum(['true', 'false']).default('false'),
  FEATURE_MERCH: z.enum(['true', 'false']).default('false'),
})

export const env = envSchema.parse(process.env)
