'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin } from 'lucide-react'
import { Card, Badge, Avatar } from '@/ui/components'
import type { ListingSummary } from '../types'
import {
  categoryLabels,
  conditionLabels,
  conditionBadgeVariant,
  formatRelativeTime,
} from '../types'
import { FavoriteButton } from './FavoriteButton'

interface ListingCardProps {
  listing: ListingSummary
  isLoggedIn?: boolean
}

export function ListingCard({ listing, isLoggedIn = false }: ListingCardProps) {
  return (
    <Link href={`/marketplace/${listing.slug}`} className="block group">
      <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
        {/* Image */}
        <div className="relative aspect-[4/3] w-full bg-[var(--color-bg-secondary)]">
          {listing.firstImageUrl ? (
            <Image
              src={listing.firstImageUrl}
              alt={listing.title}
              fill
              className="object-cover transition-transform group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Badges */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge variant={conditionBadgeVariant[listing.condition]}>
              {conditionLabels[listing.condition]}
            </Badge>
            <Badge>{categoryLabels[listing.category]}</Badge>
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
            {listing.title}
          </h3>

          {/* Price */}
          <p className="mt-1 text-lg font-bold text-[var(--color-text)]">
            ${listing.price.toFixed(2)}
          </p>

          {/* Footer: location + seller + time + favorite */}
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-2">
              <Avatar
                src={null}
                alt={listing.sellerName || 'Seller'}
                size="sm"
              />
              <span>{listing.sellerName || 'Anonymous'}</span>
            </div>
            <div className="flex items-center gap-2">
              <time dateTime={new Date(listing.createdAt).toISOString()}>
                {formatRelativeTime(listing.createdAt)}
              </time>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <span onClick={(e) => e.stopPropagation()}>
                <FavoriteButton
                  listingId={listing.id}
                  initialFavorited={listing.isFavorited ?? false}
                  initialCount={listing.favoriteCount ?? 0}
                  isLoggedIn={isLoggedIn}
                />
              </span>
            </div>
          </div>

          {listing.location && (
            <div className="mt-2 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <MapPin className="h-3 w-3" />
              <span>{listing.location}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
