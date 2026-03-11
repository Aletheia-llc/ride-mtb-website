import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/ui/components'
import { MediaGrid } from '@/modules/media'
import type { MediaType } from '@/modules/media'
// eslint-disable-next-line no-restricted-imports
import { getMediaItems } from '@/modules/media/lib/queries'

export const metadata: Metadata = {
  title: 'Media Hub | Ride MTB',
  description: 'Browse photos and videos from the mountain bike community.',
}

interface MediaPageProps {
  searchParams: Promise<{ type?: string; page?: string }>
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const params = await searchParams
  const typeFilter = params.type as MediaType | undefined
  const page = params.page ? parseInt(params.page, 10) : 1

  const validTypes: MediaType[] = ['photo', 'video']
  const mediaType = typeFilter && validTypes.includes(typeFilter) ? typeFilter : undefined

  const { items, totalCount } = await getMediaItems(
    mediaType ? { mediaType } : undefined,
    page,
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">
            Media Hub
          </h1>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Photos and videos from the community
          </p>
        </div>
        <Link href="/media/upload">
          <Button>Upload</Button>
        </Link>
      </div>

      {/* Type filter tabs */}
      <div className="mb-6 flex gap-2">
        <Link href="/media">
          <Button
            variant={!mediaType ? 'primary' : 'secondary'}
            size="sm"
          >
            All
          </Button>
        </Link>
        <Link href="/media?type=photo">
          <Button
            variant={mediaType === 'photo' ? 'primary' : 'secondary'}
            size="sm"
          >
            Photos
          </Button>
        </Link>
        <Link href="/media?type=video">
          <Button
            variant={mediaType === 'video' ? 'primary' : 'secondary'}
            size="sm"
          >
            Videos
          </Button>
        </Link>
      </div>

      <MediaGrid items={items} totalCount={totalCount} />

      {/* Pagination */}
      {totalCount > 25 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link
              href={`/media?${new URLSearchParams({
                ...(mediaType ? { type: mediaType } : {}),
                page: String(page - 1),
              }).toString()}`}
            >
              <Button variant="secondary" size="sm">
                Previous
              </Button>
            </Link>
          )}
          <span className="text-sm text-[var(--color-text-muted)]">
            Page {page}
          </span>
          {page * 25 < totalCount && (
            <Link
              href={`/media?${new URLSearchParams({
                ...(mediaType ? { type: mediaType } : {}),
                page: String(page + 1),
              }).toString()}`}
            >
              <Button variant="secondary" size="sm">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
