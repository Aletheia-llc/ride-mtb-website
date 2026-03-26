import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import type { UserRole } from '@/generated/prisma/client'
import type { AdminStats, UserAdminView } from '../types'

// ── 1. getAdminStats ────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const [
    totalUsers,
    totalPosts,
    totalTrails,
    totalEvents,
    totalReviews,
    totalListings,
  ] = await Promise.all([
    db.user.count(),
    db.post.count(),
    db.trail.count(),
    db.event.count(),
    db.gearReview.count(),
    db.listing.count(),
  ])

  return {
    totalUsers,
    totalPosts,
    totalTrails,
    totalEvents,
    totalReviews,
    totalListings,
  }
}

// ── 2. getUsers ─────────────────────────────────────────────

interface GetUsersFilters {
  role?: UserRole
  search?: string
}

export async function getUsers(
  filters?: GetUsersFilters,
  page: number = 1,
): Promise<{ users: UserAdminView[]; totalCount: number }> {
  const where: Record<string, unknown> = {}

  if (filters?.role) {
    where.role = filters.role
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { username: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [users, totalCount] = await Promise.all([
    db.user.findMany({
      where,
      ...paginate(page),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        image: true,
        role: true,
        bannedAt: true,
        createdAt: true,
        xpAggregate: {
          select: { totalXp: true },
        },
      },
    }),
    db.user.count({ where }),
  ])

  const usersWithXp: UserAdminView[] = users.map((user) => ({
    ...user,
    totalXp: user.xpAggregate?.totalXp ?? 0,
  }))

  return { users: usersWithXp, totalCount }
}

// ── 3. updateUserRole ───────────────────────────────────────

export async function updateUserRole(userId: string, role: UserRole) {
  return db.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, role: true },
  })
}

// ── 4. banUser ──────────────────────────────────────────────

export async function banUser(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { bannedAt: new Date() },
    select: { id: true, bannedAt: true },
  })
}

// ── 5. unbanUser ────────────────────────────────────────────

export async function unbanUser(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { bannedAt: null },
    select: { id: true, bannedAt: true },
  })
}

// ── 6. deleteAccount ─────────────────────────────────────────
//
// Users who have Transaction records (buyer or seller) cannot be hard-deleted
// because Transaction.buyer/seller use onDelete: Restrict to preserve the
// financial audit trail. In that case we anonymize instead: scrub PII and
// revoke auth tokens, but keep the row so transactions remain intact.
//
// Users with no transactions are hard-deleted; cascades handle everything else.

export type DeleteAccountResult =
  | { outcome: 'deleted' }
  | { outcome: 'anonymized'; reason: 'has_transactions' }

export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  const [buyerTxCount, sellerTxCount] = await Promise.all([
    db.transaction.count({ where: { buyerId: userId } }),
    db.transaction.count({ where: { sellerId: userId } }),
  ])

  const hasTransactions = buyerTxCount > 0 || sellerTxCount > 0

  if (hasTransactions) {
    // Anonymize: scrub PII, revoke auth sessions, lock the account
    await db.$transaction([
      db.account.deleteMany({ where: { userId } }),
      db.session.deleteMany({ where: { userId } }),
      db.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.local`,
          name: '[Deleted User]',
          username: `deleted-${userId}`,
          image: null,
          avatarUrl: null,
          coverUrl: null,
          bio: null,
          location: null,
          ridingStyle: null,
          websiteUrl: null,
          passwordHash: null,
          bannedAt: new Date(),
        },
      }),
    ])
    return { outcome: 'anonymized', reason: 'has_transactions' }
  }

  await db.user.delete({ where: { id: userId } })
  return { outcome: 'deleted' }
}
