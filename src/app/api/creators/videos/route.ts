import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth/config'
import { getBoss } from '@/lib/pgboss'
import { extractYouTubeVideoId } from '@/modules/creators/lib/youtube'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json() as { youtubeUrl?: unknown }
  if (typeof body.youtubeUrl !== 'string') {
    return NextResponse.json({ error: 'youtubeUrl is required' }, { status: 400 })
  }

  const videoId = extractYouTubeVideoId(body.youtubeUrl)
  if (!videoId) {
    return NextResponse.json({ error: 'Not a valid YouTube video URL' }, { status: 400 })
  }

  let video: { id: string }

  try {
    const creator = await db.creatorProfile.findUnique({
      where: { userId },
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

    video = await db.creatorVideo.create({
      data: {
        creatorId: creator.id,
        youtubeVideoId: videoId,
        title: `YouTube video ${videoId}`, // worker will update with real metadata
        status: 'queued',
      },
      select: { id: true },
    })
  } catch (err) {
    console.error('[api/creators/videos] db error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Boss send is outside the DB try/catch — a queue failure does not roll back the
  // created video record. The video remains in 'queued' status and can be retried.
  try {
    const boss = await getBoss()
    await boss.send('video.ingest', { youtubeVideoId: videoId, creatorId: video.id, source: 'manual' })
  } catch (err) {
    console.error('[api/creators/videos] boss.send failed — video queued but job not enqueued', err)
  }

  return NextResponse.json({ videoId: video.id }, { status: 201 })
}
