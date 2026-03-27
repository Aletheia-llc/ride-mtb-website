'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { uniqueSlug } from '@/lib/slugify'
import { ShopStatus, ShopType } from '@/generated/prisma/client'

const schema = z.object({
  name: z.string().min(2).max(120),
  shopType: z.nativeEnum(ShopType),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zipCode: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
  services: z.string().optional(), // comma-separated
  brands: z.string().optional(),   // comma-separated
  hoursJson: z.string().optional(), // JSON string
})

export type SubmitShopState = { errors: Record<string, string>; success?: boolean; slug?: string }

export async function submitShop(_prev: SubmitShopState, formData: FormData): Promise<SubmitShopState> {
  try {
    const user = await requireAuth()
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { errors: { general: parsed.error.issues[0]?.message ?? 'Invalid input' } }
    }

    const { name, shopType, services, brands, hoursJson, email, websiteUrl, ...rest } = parsed.data

    const slug = await uniqueSlug(name, (s) =>
      db.shop.findUnique({ where: { slug: s } }).then(Boolean)
    )

    const shop = await db.shop.create({
      data: {
        ...rest,
        name,
        slug,
        shopType,
        status: ShopStatus.PENDING_REVIEW,
        ownerId: user.id,
        submittedByUserId: user.id,
        services: services ? services.split(',').map((s) => s.trim()).filter(Boolean) : [],
        brands: brands ? brands.split(',').map((b) => b.trim()).filter(Boolean) : [],
        email: email || null,
        websiteUrl: websiteUrl || null,
        hoursJson: hoursJson ? (() => { try { return JSON.parse(hoursJson) } catch { return null } })() : null,
      },
    })

    revalidatePath('/shops')
    return { errors: {}, success: true, slug: shop.slug }
  } catch {
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
