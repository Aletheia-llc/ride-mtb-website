import Link from 'next/link'
import Image from 'next/image'
import { Star, CheckCircle, Clock } from 'lucide-react'
import { TrustBadge } from './TrustBadge'
import { calculateTrustLevel } from '@/modules/marketplace/lib/trust'

type SellerInfo = {
  id: string
  name: string | null
  image: string | null
  sellerProfile: {
    averageRating: unknown
    ratingCount: number
    totalSales: number
    isVerified: boolean
    isTrusted: boolean
  } | null
}

export function SellerCard({ seller }: { seller: SellerInfo }) {
  const profile = seller.sellerProfile
  const displayName = seller.name ?? 'Unknown Seller'
  const initial = displayName.charAt(0).toUpperCase()

  const rating = profile?.averageRating
    ? parseFloat(String(profile.averageRating))
    : null

  const trustLevel = profile
    ? calculateTrustLevel(profile.totalSales, rating, profile.isVerified)
    : 'new'

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Seller
      </h3>

      <div className="flex items-center gap-3">
        {/* Avatar */}
        {seller.image ? (
          <Image
            src={seller.image}
            alt={displayName}
            width={44}
            height={44}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white">
            {initial}
          </div>
        )}

        {/* Name + badges */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/buy-sell/seller/${seller.id}`}
              className="truncate font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
            >
              {displayName}
            </Link>
            {profile?.isVerified && (
              <CheckCircle className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
            )}
          </div>
          <TrustBadge trustLevel={trustLevel} />
        </div>
      </div>

      {/* Stats */}
      {profile && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--color-border)] pt-3">
          {rating !== null && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span className="font-medium text-[var(--color-text)]">
                {rating.toFixed(1)}
              </span>
              <span className="text-[var(--color-dim)]">
                ({profile.ratingCount})
              </span>
            </div>
          )}

          {profile.totalSales > 0 && (
            <span className="text-sm text-[var(--color-text-muted)]">
              {profile.totalSales} {profile.totalSales === 1 ? 'sale' : 'sales'}
            </span>
          )}

          <div className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
            <Clock className="h-3.5 w-3.5" />
            <span>Responds fast</span>
          </div>
        </div>
      )}
    </div>
  )
}
