import type { Metadata } from 'next'
import Link from 'next/link'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export const metadata: Metadata = {
  title: 'Creator Videos | Ride MTB',
  description: 'Watch the latest mountain biking videos from Ride MTB creators.',
}

export default async function CreatorVideosPage() {
  const videos = await db.creatorVideo.findMany({
    where: { status: 'live' },
    include: {
      creator: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Creator Videos</h1>
        <p className="text-[var(--color-text-muted)]">
          The latest mountain biking videos from Ride MTB creators.
        </p>
      </div>

      {/* Video grid */}
      {videos.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">No videos yet</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Check back soon — creator videos will appear here once published.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/creators/videos/${video.id}`}
              className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-colors hover:border-[var(--color-primary)]"
            >
              {/* Thumbnail */}
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="aspect-video w-full bg-[var(--color-bg-secondary)]" />
              )}

              {/* Info */}
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                  {video.title}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {video.creator.displayName}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
