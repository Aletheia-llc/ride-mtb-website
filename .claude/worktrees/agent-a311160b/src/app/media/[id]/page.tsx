import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, Badge, Avatar } from '@/ui/components'
import { PhotoViewer, VideoPlayer } from '@/modules/media'
// eslint-disable-next-line no-restricted-imports
import { getMediaItemById } from '@/modules/media/lib/queries'
import { DeleteMediaButton } from './DeleteMediaButton'
import { auth } from '@/lib/auth/config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const item = await getMediaItemById(id)

  return {
    title: item ? `${item.title ?? 'Media'} | Ride MTB` : 'Not Found | Ride MTB',
    description: item?.description ?? 'View media on Ride MTB.',
  }
}

export default async function MediaItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const item = await getMediaItemById(id)

  if (!item) {
    notFound()
  }

  const session = await auth()
  const isOwner = session?.user?.id === item.userId

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/media"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Media
      </Link>

      {/* Media viewer */}
      <div className="mb-6">
        {item.mediaType === 'photo' ? (
          <PhotoViewer items={[item]} />
        ) : (
          <VideoPlayer url={item.url} title={item.title} />
        )}
      </div>

      {/* Info card */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              {item.title && (
                <h1 className="text-xl font-bold text-[var(--color-text)]">
                  {item.title}
                </h1>
              )}
              <Badge variant={item.mediaType === 'photo' ? 'info' : 'default'}>
                {item.mediaType}
              </Badge>
            </div>

            {item.description && (
              <p className="mt-2 text-[var(--color-text-muted)]">
                {item.description}
              </p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Avatar
                src={item.userImage}
                alt={item.userName ?? 'User'}
                size="sm"
              />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  {item.userName ?? 'Unknown user'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {isOwner && <DeleteMediaButton mediaId={item.id} />}
        </div>
      </Card>
    </div>
  )
}
