import { notFound } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { VideoPlayer } from '@/modules/creators/components/VideoPlayer'

interface Props {
  params: Promise<{ videoId: string }>
}

export default async function VideoWatchPage({ params }: Props) {
  const { videoId } = await params

  const video = await db.creatorVideo.findUnique({
    where: { id: videoId, status: 'live' },
    include: {
      creator: { select: { displayName: true } },
    },
  })
  if (!video) notFound()

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <VideoPlayer
        videoId={video.id}
        hlsUrl={video.bunnyHlsUrl ?? ''}
        title={video.title}
        creatorName={video.creator.displayName}
        thumbnailUrl={video.thumbnailUrl ?? undefined}
      />
      <div className="mt-4">
        <h1 className="text-xl font-bold text-[var(--color-text)]">{video.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">by {video.creator.displayName}</p>
        {video.description && (
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-text)]">{video.description}</p>
        )}
      </div>
    </main>
  )
}
