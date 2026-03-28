'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ShopStatus } from '@/generated/prisma/client'

export async function assignShopOwner(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireAdmin()

    const shopId = formData.get('shopId')?.toString().trim() ?? ''
    const userEmail = formData.get('userEmail')?.toString().trim() ?? ''

    if (!shopId || !userEmail) {
      return { error: 'Shop ID and owner email are required.' }
    }

    if (!userEmail.includes('@')) {
      return { error: 'Please enter a valid email address.' }
    }

    const user = await db.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return { error: 'No user found with that email.' }
    }

    await db.shop.update({
      where: { id: shopId },
      data: { ownerId: user.id, status: ShopStatus.CLAIMED },
    })

    revalidatePath('/admin/shops')
    revalidatePath('/shops')

    return { success: true }
  } catch {
    return { error: 'Something went wrong.' }
  }
}
