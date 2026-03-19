import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import type { ListingWithPhotos } from '@/modules/marketplace/types'
import { ConditionBadge } from './ConditionBadge'

/* ---------- helpers ---------- */

function formatPrice(price: number | string | { toString(): string }): string {
  const num = typeof price === 'number' ? price : parseFloat(String(price))
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function timeAgo(date: Date | string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(days / 365)
  return `${years}y ago`
}

/* ---------- component ---------- */

interface ListingCardProps {
  listing: ListingWithPhotos
  initialSaved?: boolean
}

export function ListingCard({ listing }: ListingCardProps) {
  const coverPhoto = listing.photos.find((p) => p.isCover) ?? listing.photos[0]
  const coverUrl = coverPhoto?.url ?? '/placeholder-bike.jpg'

  const location = [listing.city, listing.state].filter(Boolean).join(', ')

  const seller = listing.seller
  const profile = seller.sellerProfile
  const rating = profile?.averageRating ? parseFloat(String(profile.averageRating)) : null

  return (
    <Link
      href={`/marketplace/${listing.slug}`}
      className="group block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-secondary)]"
    >
      {/* Cover photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-bg)]">
        <Image
          src={coverUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Price overlay */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <span className="rounded-lg bg-black/70 px-2.5 py-1 text-sm font-bold text-white backdrop-blur-sm">
            {formatPrice(listing.price)}
          </span>
          {listing.acceptsOffers && (
            <span className="rounded-lg bg-[var(--color-primary)]/80 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              OBO
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2 p-3">
        {/* Title */}
        <h3 className="truncate text-sm font-semibold text-[var(--color-text)]">
          {listing.title}
        </h3>

        {/* Condition + location + time */}
        <div className="flex items-center gap-2">
          <ConditionBadge condition={listing.condition} />
          {location && (
            <span className="truncate text-xs text-[var(--color-text-muted)]">{location}</span>
          )}
          <span className="ml-auto shrink-0 text-xs text-[var(--color-dim)]">
            {timeAgo(listing.createdAt)}
          </span>
        </div>

        {/* Seller info */}
        <div className="flex items-center gap-1.5 border-t border-[var(--color-border)] pt-2">
          {seller.image ? (
            <Image
              src={seller.image}
              alt={seller.name ?? 'Seller'}
              width={20}
              height={20}
              className="rounded-full"
            />
          ) : (
            <div className="h-5 w-5 rounded-full bg-[var(--color-border)]" />
          )}
          <span className="truncate text-xs text-[var(--color-text-muted)]">
            {seller.name ?? 'Unknown'}
          </span>
          {rating !== null && (
            <span className="flex items-center gap-0.5 text-xs text-yellow-500">
              <Star className="h-3 w-3 fill-current" />
              {rating.toFixed(1)}
            </span>
          )}
          {profile && profile.totalSales > 0 && (
            <span className="text-xs text-[var(--color-dim)]">
              {profile.totalSales} {profile.totalSales === 1 ? 'sale' : 'sales'}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
