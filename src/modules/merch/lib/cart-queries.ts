import 'server-only'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function getCartItems(userId: string) {
  return db.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, price: true,
          imageUrls: true, inStock: true, variants: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getCartItemCount(userId: string): Promise<number> {
  const result = await db.cartItem.aggregate({
    where: { userId },
    _sum: { quantity: true },
  })
  return result._sum.quantity ?? 0
}
