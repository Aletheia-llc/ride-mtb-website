import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Load .env first (has correct pooler host), then .env.local for remaining vars
config({ path: path.join(__dirname, '.env') })
config({ path: path.join(__dirname, '.env.local') })

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_DIRECT_URL!,
  },
})
