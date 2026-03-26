import 'server-only'
import '@/lib/env' // validate required env vars at startup
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
  prisma: PrismaClient | undefined
}

// Prefer DATABASE_DIRECT_URL (session pooler, aws-1-, no pgbouncer limitations).
// Fall back to DATABASE_POOLED_URL trimmed to strip any trailing newlines from Vercel CLI.
const connectionString =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_POOLED_URL?.trim()

if (!connectionString) {
  throw new Error(
    'Database connection not configured. Set DATABASE_DIRECT_URL or DATABASE_POOLED_URL environment variables.'
  )
}

export const pool = globalForDb.pool ?? new Pool({
  connectionString,
  max: 10,
})

const adapter = new PrismaPg(pool)

export const db = globalForDb.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool
  globalForDb.prisma = db
}
