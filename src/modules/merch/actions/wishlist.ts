'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function addToWishlist(productId: string) {
  const user = await requireAuth()
  await db.wishlistItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    update: {},
    create: { userId: user.id, productId },
  })
  revalidatePath('/merch')
}

export async function removeFromWishlist(productId: string) {
  const user = await requireAuth()
  await db.wishlistItem.deleteMany({
    where: { userId: user.id, productId },
  })
  revalidatePath('/merch')
}
