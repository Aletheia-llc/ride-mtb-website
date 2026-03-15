'use server'

import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ManufacturerFormState = {
  errors?: {
    general?: string
    name?: string
    slug?: string
    logoUrl?: string
  }
}

export async function createManufacturer(
  _prev: ManufacturerFormState,
  formData: FormData
): Promise<ManufacturerFormState> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() ?? ''
  const logoUrl = (formData.get('logoUrl') as string | null)?.trim() || undefined

  const errors: ManufacturerFormState['errors'] = {}
  if (!name) errors.name = 'Name is required'
  if (!slug) errors.slug = 'Slug is required'
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Slug must be lowercase letters, numbers, and hyphens only'
  if (logoUrl && !logoUrl.startsWith('http')) errors.logoUrl = 'Logo URL must be a valid URL'
  if (Object.keys(errors).length > 0) return { errors }

  try {
    await db.bikeManufacturer.create({ data: { name, slug, logoUrl } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return { errors: { slug: 'A manufacturer with this slug already exists' } }
    }
    return { errors: { general: 'Failed to create manufacturer' } }
  }

  revalidatePath('/admin/fantasy/manufacturers')
  redirect('/admin/fantasy/manufacturers')
}

export async function updateManufacturer(
  _prev: ManufacturerFormState,
  formData: FormData
): Promise<ManufacturerFormState> {
  const id = formData.get('id') as string
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() ?? ''
  const logoUrl = (formData.get('logoUrl') as string | null)?.trim() || undefined

  const errors: ManufacturerFormState['errors'] = {}
  if (!name) errors.name = 'Name is required'
  if (!slug) errors.slug = 'Slug is required'
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Slug must be lowercase letters, numbers, and hyphens only'
  if (logoUrl && !logoUrl.startsWith('http')) errors.logoUrl = 'Logo URL must be a valid URL'
  if (Object.keys(errors).length > 0) return { errors }

  try {
    await db.bikeManufacturer.update({ where: { id }, data: { name, slug, logoUrl: logoUrl ?? null } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return { errors: { slug: 'A manufacturer with this slug already exists' } }
    }
    return { errors: { general: 'Failed to update manufacturer' } }
  }

  revalidatePath('/admin/fantasy/manufacturers')
  redirect('/admin/fantasy/manufacturers')
}

export async function deleteManufacturer(id: string): Promise<void> {
  await db.bikeManufacturer.delete({ where: { id } })
  revalidatePath('/admin/fantasy/manufacturers')
}
