import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { rateLimit } from '@/lib/rate-limit'
import { checkImageSafety } from '@/lib/vision/moderation'
import { BUCKET, StorageFolders, getPublicUrl } from '@/lib/supabase/storage'
import { getSupabaseClient } from '@/lib/supabase/client'
import { db } from '@/lib/db/client'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await rateLimit({ userId: session.user.id, action: 'profile-avatar-upload', maxPerMinute: 10 })
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const moderation = await checkImageSafety(buffer)
  if (!moderation.pass) {
    return NextResponse.json(
      { error: "Photo didn't pass our content guidelines. Please choose a different image." },
      { status: 422 },
    )
  }

  // Upload directly via Supabase client (not uploadFile helper — that expects File, not Buffer)
  const filename = `${session.user.id}.jpg`
  const path = `${StorageFolders.avatars}/${filename}`

  const { error: uploadError } = await getSupabaseClient()
    .storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '31536000',
    })

  if (uploadError) {
    console.error('[avatar-upload] Supabase upload error:', uploadError.message)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  const avatarUrl = getPublicUrl(StorageFolders.avatars, filename)

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { avatarUrl },
    })
  } catch (err) {
    console.error('[avatar-upload] DB update error:', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ avatarUrl })
}
