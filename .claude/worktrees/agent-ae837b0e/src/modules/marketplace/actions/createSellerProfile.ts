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

