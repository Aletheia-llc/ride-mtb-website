import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { uploadFile, StorageFolders } from '@/lib/supabase/storage'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await rateLimit({
      userId: session.user.id,
      action: 'marketplace-image-upload',
      maxPerMinute: 20,
    })
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${session.user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const url = await uploadFile(StorageFolders.marketplace, filename, file)
  return NextResponse.json({ url })
}
