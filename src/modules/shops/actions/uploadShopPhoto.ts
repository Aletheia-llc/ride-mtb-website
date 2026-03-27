'use server'
import { revalidatePath } from 'next/cache'
import { put, del } from '@vercel/blob'
import { requireShopOwner } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export type PhotoState = { errors: Record<string, string>; success?: boolean }

export async function uploadShopPhoto(slug: string, _prev: PhotoState, formData: FormData): Promise<PhotoState> {
  try {
    const { shop } = await requireShopOwner(slug)

    const photoCount = await db.shopPhoto.count({ where: { shopId: shop.id } })
    if (photoCount >= 10) {
      return { errors: { general: 'Maximum 10 photos per shop' } }
    }

    const file = formData.get('photo') as File | null
    if (!file || file.size === 0) {
      return { errors: { general: 'No file provided' } }
    }

    const blob = await put(`shops/${shop.id}/${Date.now()}-${file.name}`, file, {
      access: 'public',
    })

    const maxOrder = await db.shopPhoto.findFirst({
      where: { shopId: shop.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    await db.shopPhoto.create({
      data: {
        shopId: shop.id,
        url: blob.url,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    })

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Upload failed. Please try again.' } }
  }
}

export async function deleteShopPhoto(slug: string, photoId: string): Promise<PhotoState> {
  try {
    const { shop } = await requireShopOwner(slug)

    const photo = await db.shopPhoto.findFirst({ where: { id: photoId, shopId: shop.id } })
    if (!photo) return { errors: { general: 'Photo not found' } }

    await del(photo.url)
    await db.shopPhoto.delete({ where: { id: photoId } })

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Failed to delete photo' } }
  }
}

export async function setPhotoAsCover(slug: string, photoId: string): Promise<PhotoState> {
  try {
    const { shop } = await requireShopOwner(slug)

    await db.$transaction(async (tx) => {
      await tx.shopPhoto.updateMany({ where: { shopId: shop.id }, data: { isPrimary: false } })
      await tx.shopPhoto.update({ where: { id: photoId }, data: { isPrimary: true } })
    })

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Failed to set cover photo' } }
  }
}
