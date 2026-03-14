'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function createSellerProfile() {
  const user = await requireAuth()

  const existing = await db.sellerProfile.findUnique({ where: { userId: user.id } })
  if (existing) return existing

  const profile = await db.sellerProfile.create({
    data: { userId: user.id },
  })

  revalidatePath('/marketplace/sell')
  return profile
}

export async function getSellerProfile(userId: string) {
  return db.sellerProfile.findUnique({
    where: { userId },
    include: { reviews: { orderBy: { createdAt: 'desc' }, take: 10 } },
  })
}

function getTrustLevel(profile: { isVerified: boolean; isTrusted: boolean; totalSales: number; ratingCount: number }) {
  if (profile.isVerified && profile.isTrusted && profile.totalSales >= 10) return 'trusted'
  if (profile.totalSales >= 3 || profile.ratingCount >= 3) return 'established'
  if (profile.totalSales >= 1) return 'new'
  return 'unverified'
}

export { getTrustLevel }
