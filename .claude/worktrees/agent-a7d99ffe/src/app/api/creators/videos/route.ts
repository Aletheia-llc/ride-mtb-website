import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import { getBoss } from '@/lib/pgboss'
import { extractYouTubeVideoId } from '@/modules/creators/lib/youtube'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireAuth()

  const body = await req.json() as { youtubeUrl?: unknown }
  if (typeof body.youtubeUrl !== 'string') {
    return NextResponse.json({ error: 'youtubeUrl is required' }, { status: 400 })
  }

  const videoId = extractYouTubeVideoId(body.youtubeUrl)
  if (!videoId) {
    return NextResponse.json({ error: 'Not a valid YouTube video URL' }, { status: 400 })
  }

  const creator = await db.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  })
  if (!creator || creator.status !== 'active') {
    return NextResponse.json({ error: 'Creator account not active' }, { status: 403 })
  }

  const existing = await db.creatorVideo.findUnique({
    where: { creatorId_youtubeVideoId: { creatorId: creator.id, youtubeVideoId: videoId } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'Video already submitted' }, { status: 409 })
  }

  const video = await db.creatorVideo.create({
    data: {
      creatorId: creator.id,
      youtubeVideoId: videoId,
      title: `YouTube video ${videoId}`, // worker will update with real metadata
      status: 'queued',
    },
    select: { id: true },
  })

  const boss = await getBoss()
  await boss.send('video.ingest', { youtubeVideoId: videoId, creatorId: creator.id, source: 'manual' })

  return NextResponse.json({ videoId: video.id }, { status: 201 })
}
