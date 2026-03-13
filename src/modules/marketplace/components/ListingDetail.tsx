import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Clock, Tag, MessageCircle } from 'lucide-react'
import { Badge, Avatar, Card } from '@/ui/components'
import type { ListingDetailData } from '../types'
import {
  categoryLabels,
  conditionLabels,
  conditionBadgeVariant,
  statusLabels,
  formatRelativeTime,
} from '../types'
import { FavoriteButton } from './FavoriteButton'

interface ListingDetailProps {
  listing: ListingDetailData
  favoriteCount?: number
  isFavorited?: boolean
  isLoggedIn?: boolean
  currentUserId?: string
}

export function ListingDetail({ listing, favoriteCount, isFavorited, isLoggedIn = false, currentUserId }: ListingDetailProps) {
  const hasImages = listing.imageUrls.length > 0

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* Image gallery — 3 cols */}
      <div className="lg:col-span-3">
        {/* Main image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--color-bg-secondary)]">
          {hasImages ? (
            <Image
              src={listing.imageUrls[0]}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
              <span>No images available</span>
            </div>
          )}
        </div>

        {/* Thumbnail row */}
        {listing.imageUrls.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {listing.imageUrls.map((url, i) => (
              <div
                key={i}
                className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg-secondary)]"
              >
                <Image
                  src={url}
                  alt={`${listing.title} image ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details — 2 cols */}
      <div className="lg:col-span-2 space-y-6">
        {/* Title + price */}
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant={conditionBadgeVariant[listing.condition]}>
              {conditionLabels[listing.condition]}
            </Badge>
            <Badge>{categoryLabels[listing.category]}</Badge>
            {listing.status !== 'active' && (
              <Badge variant={listing.status === 'sold' ? 'error' : 'warning'}>
                {statusLabels[listing.status]}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] sm:text-3xl">
            {listing.title}
          </h1>
          <div className="mt-2 flex items-center gap-4">
            <p className="text-3xl font-bold text-[var(--color-primary)]">
              ${listing.price.toFixed(2)}
            </p>
            <FavoriteButton
              listingId={listing.id}
              initialFavorited={isFavorited ?? listing.isFavorited ?? false}
              initialCount={favoriteCount ?? listing.favoriteCount ?? 0}
              isLoggedIn={isLoggedIn ?? false}
            />
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
          {listing.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{listing.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>Listed {formatRelativeTime(listing.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tag className="h-4 w-4" />
            <span>{categoryLabels[listing.category]}</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Description</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
            {listing.description}
          </div>
        </div>

        {/* Seller info */}
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Seller
          </h2>
          <div className="flex items-center gap-3">
            <Avatar
              src={listing.seller.image}
              alt={listing.seller.name || 'Seller'}
              size="lg"
            />
            <div>
              <p className="font-medium text-[var(--color-text)]">
                {listing.seller.name || 'Anonymous'}
              </p>
            </div>
          </div>
          {currentUserId && currentUserId !== listing.sellerId && (
            <Link
              href={`/messages?to=${listing.sellerId}`}
              className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <MessageCircle size={16} />
              Message Seller
            </Link>
          )}
        </Card>
      </div>
    </div>
  )
}
