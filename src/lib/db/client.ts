import 'server-only'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
  prisma: PrismaClient | undefined
}

const pool = globalForDb.pool ?? new Pool({
  connectionString: process.env.DATABASE_POOLED_URL,
  max: 2,
})

const adapter = new PrismaPg(pool)

export const db = globalForDb.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool
  globalForDb.prisma = db
}
