'use server'

import { requireAuth } from '@/lib/auth/guards'
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { FacilityPhotoStatus, UserRole } from '@/generated/prisma/client'
import { randomUUID } from 'crypto'
import { stripExifFromJpeg } from '../lib/exif'
import { screenImage } from '../lib/moderation'
import { getAdminSupabase } from '../lib/supabase'
import { revalidatePath } from 'next/cache'

const BUCKET = 'facility-photos'
const MAX_PHOTOS_PER_FACILITY = 5
const MAX_PHOTOS_PER_DAY = 20
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function detectMimeType(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png'
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image/webp'
  return null
}

export async function uploadFacilityPhoto(
  facilityId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  // 1. Auth check
  const user = await requireAuth()
  const file = formData.get('photo')

  // 2. File instance + size check
  if (!(file instanceof File)) {
    return { success: false, error: 'No file provided' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File too large (max 10MB)' }
  }

  // 3. Read buffer + detect MIME type
  const arrayBuffer = await file.arrayBuffer()
  // Use Uint8Array to get Buffer<ArrayBuffer> (avoids SharedArrayBuffer union type)
  let buffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer))

  const mimeType = detectMimeType(buffer)
  if (!mimeType) {
    return { success: false, error: 'Unsupported file type. Use JPEG, PNG, or WebP.' }
  }

  // 4. Caption extraction + server-side length validation
  const rawCaption = formData.get('caption')
  const caption = typeof rawCaption === 'string' && rawCaption.trim().length > 0
    ? rawCaption.trim().slice(0, 120)
    : null

  // 5. Rate limit checks (after MIME validation to avoid unnecessary DB queries)
  const [facilityCount, dailyCount] = await Promise.all([
    db.facilityPhoto.count({
      where: { facilityId, userId: user.id, status: { not: FacilityPhotoStatus.REJECTED } },
    }),
    db.facilityPhoto.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  if (facilityCount >= MAX_PHOTOS_PER_FACILITY) {
    return { success: false, error: 'You have reached the maximum photos for this facility (5).' }
  }
  if (dailyCount >= MAX_PHOTOS_PER_DAY) {
    return { success: false, error: 'You have reached your daily upload limit (20 photos).' }
  }

  // 6. Strip EXIF from JPEG
  if (mimeType === 'image/jpeg') {
    buffer = stripExifFromJpeg(buffer)
  }

  // 7. Run moderation BEFORE uploading to storage
  const base64 = buffer.toString('base64')
  const aiVerdict = await screenImage(base64, mimeType)

  if (aiVerdict === 'REJECTED') {
    return { success: false, error: 'Photo was rejected for violating community guidelines.' }
  }

  // 8. Upload to Supabase Storage (only after moderation clears)
  const supabase = getAdminSupabase()
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp'
  const storageKey = `${facilityId}/${user.id}/${Date.now()}-${randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, buffer, { contentType: mimeType, upsert: false })

  if (uploadError) {
    return { success: false, error: 'Upload failed. Please try again.' }
  }

  // 9. Create DB record after successful upload
  await db.facilityPhoto.create({
    data: {
      facilityId,
      userId: user.id,
      storageKey,
      caption,
      status: FacilityPhotoStatus.PENDING,
      aiVerdict,
    },
  })

  const facility = await db.facility.findUnique({
    where: { id: facilityId },
    select: { stateSlug: true, slug: true },
  })
  if (facility) revalidatePath(`/parks/${facility.stateSlug}/${facility.slug}`)

  return { success: true }
}

export async function getFacilityPhotos(facilityId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []

  const supabase = getAdminSupabase()
  const photos = await db.facilityPhoto.findMany({
    where: { facilityId, status: FacilityPhotoStatus.APPROVED },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: { select: { name: true } } },
  })
  return photos.map((p) => ({
    ...p,
    url: supabase.storage.from(BUCKET).getPublicUrl(p.storageKey).data.publicUrl,
  }))
}

export async function approveFacilityPhoto(photoId: string) {
  await requireAdmin()
  const photo = await db.facilityPhoto.update({
    where: { id: photoId },
    data: { status: FacilityPhotoStatus.APPROVED },
    include: { facility: { select: { stateSlug: true, slug: true } } },
  })
  revalidatePath(`/parks/${photo.facility.stateSlug}/${photo.facility.slug}`)
}

export async function rejectFacilityPhoto(photoId: string) {
  await requireAdmin()
  const photo = await db.facilityPhoto.findUnique({
    where: { id: photoId },
    include: { facility: { select: { stateSlug: true, slug: true } } },
  })
  if (!photo) return

  // Delete DB record first — if this fails, storage object is still intact (recoverable)
  await db.facilityPhoto.delete({ where: { id: photoId } })

  // Delete from storage after DB succeeds — log but don't rethrow (orphaned blob is recoverable)
  try {
    const supabase = getAdminSupabase()
    await supabase.storage.from(BUCKET).remove([photo.storageKey])
  } catch (err) {
    console.error('[parks/photos] Failed to delete storage object after DB delete:', err)
  }

  revalidatePath(`/parks/${photo.facility.stateSlug}/${photo.facility.slug}`)
}

export async function deleteFacilityPhoto(photoId: string) {
  const user = await requireAuth()
  const photo = await db.facilityPhoto.findUnique({
    where: { id: photoId },
    include: { facility: { select: { stateSlug: true, slug: true } } },
  })
  if (!photo) return
  if (photo.userId !== user.id && user.role !== UserRole.admin) throw new Error('Not authorized')

  const supabase = getAdminSupabase()
  await supabase.storage.from(BUCKET).remove([photo.storageKey])
  await db.facilityPhoto.delete({ where: { id: photoId } })
  revalidatePath(`/parks/${photo.facility.stateSlug}/${photo.facility.slug}`)
}
