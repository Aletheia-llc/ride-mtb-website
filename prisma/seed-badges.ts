import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import pg from 'pg'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(__dirname, '..', '.env') })
config({ path: path.join(__dirname, '..', '.env.local') })

const pool = new pg.Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME ?? 'postgres',
  ssl: process.env.DATABASE_HOST?.includes('supabase.com')
    ? { rejectUnauthorized: false }
    : false,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const BADGES = [
  {
    slug: 'first-post',
    name: 'First Post',
    description: 'Created your first forum post.',
    icon: 'MessageSquare',
    color: '#22c55e',
  },
  {
    slug: '10-posts',
    name: 'Regular',
    description: 'Created 10 forum posts.',
    icon: 'MessageCircle',
    color: '#3b82f6',
  },
  {
    slug: '50-posts',
    name: 'Contributor',
    description: 'Created 50 forum posts.',
    icon: 'MessagesSquare',
    color: '#8b5cf6',
  },
  {
    slug: '100-posts',
    name: 'Veteran',
    description: 'Created 100 forum posts.',
    icon: 'Award',
    color: '#f59e0b',
  },
  {
    slug: 'first-thread',
    name: 'Thread Starter',
    description: 'Created your first thread.',
    icon: 'FilePlus',
    color: '#06b6d4',
  },
  {
    slug: 'helpful',
    name: 'Helpful',
    description: 'Received 10 upvotes across all posts.',
    icon: 'ThumbsUp',
    color: '#10b981',
  },
  {
    slug: 'popular',
    name: 'Popular',
    description: 'Received 50 upvotes across all posts.',
    icon: 'TrendingUp',
    color: '#f97316',
  },
  {
    slug: 'month-old',
    name: 'Early Rider',
    description: 'Account is at least 30 days old.',
    icon: 'Calendar',
    color: '#ec4899',
  },
]

async function main() {
  console.log('Seeding forum badges…')
  for (const badge of BADGES) {
    await prisma.forumBadge.upsert({
      where: { slug: badge.slug },
      create: badge,
      update: badge,
    })
    console.log(`  ✓ ${badge.name}`)
  }
  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
