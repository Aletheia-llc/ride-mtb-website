import 'server-only'
import { db } from '@/lib/db/client'

export async function getLeaderboard(limit: number = 25) {
  return db.xpAggregate.findMany({
    orderBy: { totalXp: 'desc' },
    take: limit,
    include: { user: { select: { id: true, name: true, image: true, username: true } } },
  })
}

export async function getUserXP(userId: string) {
  return db.xpAggregate.findUnique({ where: { userId } })
}

export async function getUserGrants(userId: string, limit: number = 50) {
  return db.xpGrant.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getWeeklyXp(userId: string): Promise<number> {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const result = await db.xpGrant.aggregate({
    where: { userId, createdAt: { gte: startOfWeek } },
    _sum: { total: true },
  })

  return result._sum.total ?? 0
}
