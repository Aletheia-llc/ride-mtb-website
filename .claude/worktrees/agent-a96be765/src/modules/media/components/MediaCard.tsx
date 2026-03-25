import Image from 'next/image'
import Link from 'next/link'
import { Badge, Avatar } from '@/ui/components'
import type { MediaItemData } from '../types'

interface MediaCardProps {
  item: MediaItemData
}

function isYouTube(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function getYouTubeThumbnail(url: string): string | null {
  let videoId: string | null = null

  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split(/[?&#]/)[0] ?? null
  } else if (url.includes('youtube.com')) {
    const match = url.match(/[?&]v=([^&#]+)/)
    videoId = match?.[1] ?? null
  }

  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null
}

export function MediaCard({ item }: MediaCardProps) {
  const thumbnailSrc =
    item.thumbnailUrl ??
    (item.mediaType === 'video' && isYouTube(item.url)
      ? getYouTubeThumbnail(item.url)
      : null)

  return (
    <Link
      href={`/media/${item.id}`}
      className="group relative block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Thumbnail / placeholder */}
      <div className="relative aspect-video w-full bg-[var(--color-bg-secondary)]">
        {item.mediaType === 'photo' ? (
          <Image
            src={item.thumbnailUrl ?? item.url}
            alt={item.title ?? 'Media'}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt={item.title ?? 'Video thumbnail'}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
          </div>
        )}

        {/* Video play icon overlay */}
        {item.mediaType === 'video' && thumbnailSrc && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 p-2 text-white">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Info overlay */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {item.title && (
              <p className="truncate text-sm font-medium text-[var(--color-text)]">
                {item.title}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2">
              <Avatar
                src={item.userImage}
                alt={item.userName ?? 'User'}
                size="sm"
                className="h-5 w-5"
              />
              <span className="truncate text-xs text-[var(--color-text-muted)]">
                {item.userName ?? 'Unknown user'}
              </span>
            </div>
          </div>
          <Badge variant={item.mediaType === 'photo' ? 'info' : 'default'}>
            {item.mediaType}
          </Badge>
        </div>
      </div>
    </Link>
  )
}
