'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireShopOwner } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ShopType } from '@/generated/prisma/client'

const schema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zipCode: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  shopType: z.nativeEnum(ShopType),
  services: z.string().optional(),
  brands: z.string().optional(),
  hoursJson: z.string().optional(),
})

export type UpdateShopState = { errors: Record<string, string>; success?: boolean }

export async function updateShop(slug: string, _prev: UpdateShopState, formData: FormData): Promise<UpdateShopState> {
  try {
    const { shop } = await requireShopOwner(slug)
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid input' } }
    }

    const { services, brands, hoursJson, email, websiteUrl, shopType, ...rest } = parsed.data

    await db.shop.update({
      where: { id: shop.id },
      data: {
        ...rest,
        shopType,
        services: services ? services.split(',').map((s) => s.trim()).filter(Boolean) : [],
        brands: brands ? brands.split(',').map((b) => b.trim()).filter(Boolean) : [],
        email: email || null,
        websiteUrl: websiteUrl || null,
        hoursJson: hoursJson ? (() => { try { return JSON.parse(hoursJson) } catch { return null } })() : null,
      },
    })

    revalidatePath(`/shops/${slug}`)
    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
