import 'server-only'
import { Prisma } from '@/generated/prisma/client'

export const PAGE_SIZE = 20

export const authorSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  avatarUrl: true,
  role: true,
  karma: true,
} satisfies Prisma.UserSelect

export const authorDetailSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
  avatarUrl: true,
  role: true,
  karma: true,
  bio: true,
  createdAt: true,
  isPremium: true,
  isVerifiedCreator: true,
  _count: { select: { posts: { where: { deletedAt: null } } } },
  userBadges: {
    include: {
      badge: { select: { name: true, description: true, icon: true, color: true } },
    },
  },
} satisfies Prisma.UserSelect

export const categorySelect = {
  id: true,
  name: true,
  slug: true,
  color: true,
  icon: true,
} satisfies Prisma.CategorySelect

export const tagInclude = {
  tag: { select: { id: true, name: true, slug: true, color: true } },
} satisfies Prisma.PostTagInclude

export function getTimePeriodStart(period: string): Date {
  const now = new Date()
  const ms: Record<string, number> = {
    day: 86_400_000,
    week: 7 * 86_400_000,
    month: 30 * 86_400_000,
    year: 365 * 86_400_000,
  }
  return ms[period] ? new Date(now.getTime() - ms[period]) : new Date(0)
}
