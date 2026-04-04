'use server'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import type { AffiliateLinkType } from '@/generated/prisma/client'

export interface SaveAffiliateLinkState {
  errors: string | null
}

export async function saveAffiliateLinkAction(
  _prev: SaveAffiliateLinkState,
  formData: FormData
): Promise<SaveAffiliateLinkState> {
  await requireAdmin()

  const id = formData.get('id') as string | null
  const name = (formData.get('name') as string)?.trim()
  const url = (formData.get('url') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const linkType = (formData.get('linkType') as AffiliateLinkType) ?? 'external'
  const commission = parseFloat(formData.get('commission') as string) || 0
  const associatedId = (formData.get('associatedId') as string)?.trim() || null

  const shopId = linkType === 'shop_directory' ? associatedId : null
  const gearReviewId = linkType === 'gear_review' ? associatedId : null

  if (!name) return { errors: 'Name is required' }
  if (!url) return { errors: 'URL is required' }
  if (!slug) return { errors: 'Slug is required' }

  if (id) {
    await db.affiliateLink.update({
      where: { id },
      data: { name, url, slug, linkType, commission, shopId, gearReviewId },
    })
  } else {
    await db.affiliateLink.create({
      data: { name, url, slug, linkType, commission, shopId, gearReviewId },
    })
  }

  revalidatePath('/admin/affiliate')
  return { errors: null }
}

export async function toggleAffiliateLinkAction(formData: FormData): Promise<void> {
  await requireAdmin()
  const id = formData.get('id') as string
  const link = await db.affiliateLink.findUnique({ where: { id }, select: { isActive: true } })
  if (!link) return
  await db.affiliateLink.update({ where: { id }, data: { isActive: !link.isActive } })
  revalidatePath('/admin/affiliate')
}
