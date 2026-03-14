'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const addSchema = z.object({
  productId: z.string().min(1),
  variantKey: z.string().default('default'),
  quantity: z.number().int().min(1).max(99),
})

export async function addToCart(input: {
  productId: string
  variantKey?: string
  quantity?: number
}) {
  const session = await requireAuth()
  const { productId, variantKey, quantity } = addSchema.parse({
    productId: input.productId,
    variantKey: input.variantKey ?? 'default',
    quantity: input.quantity ?? 1,
  })

  const product = await db.merchProduct.findUnique({
    where: { id: productId, status: 'published' },
    select: { id: true, inStock: true },
  })
  if (!product) throw new Error('Product not found')
  if (!product.inStock) throw new Error('Product is out of stock')

  await db.cartItem.upsert({
    where: { userId_productId_variantKey: { userId: session.id, productId, variantKey } },
    update: { quantity: { increment: quantity } },
    create: { userId: session.id, productId, variantKey, quantity },
  })

  revalidatePath('/merch')
  revalidatePath('/merch/cart')
}

export async function removeFromCart(cartItemId: string) {
  const session = await requireAuth()

  await db.cartItem.deleteMany({
    where: { id: cartItemId, userId: session.id },
  })

  revalidatePath('/merch/cart')
}

export async function updateCartQuantity(cartItemId: string, quantity: number) {
  const session = await requireAuth()

  if (quantity <= 0) {
    await db.cartItem.deleteMany({ where: { id: cartItemId, userId: session.id } })
  } else {
    await db.cartItem.updateMany({
      where: { id: cartItemId, userId: session.id },
      data: { quantity },
    })
  }

  revalidatePath('/merch/cart')
}

export async function clearCart() {
  const session = await requireAuth()
  await db.cartItem.deleteMany({ where: { userId: session.id } })
  revalidatePath('/merch/cart')
}
