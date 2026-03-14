import { getTrustLevel } from '../actions/createSellerProfile'

export type SellerProfileData = {
  id: string
  totalSales: number
  averageRating: number | null
  ratingCount: number
  isVerified: boolean
  isTrusted: boolean
  stripeOnboarded: boolean
  createdAt: Date
}

interface SellerProfileCardProps {
  profile: SellerProfileData | null
  sellerName: string | null
}

const trustBadge: Record<string, { label: string; className: string }> = {
  trusted: { label: 'Trusted Seller', className: 'bg-green-100 text-green-800' },
  established: { label: 'Established', className: 'bg-blue-100 text-blue-800' },
  new: { label: 'New Seller', className: 'bg-yellow-100 text-yellow-800' },
  unverified: { label: 'Unverified', className: 'bg-gray-100 text-gray-600' },
}

export function SellerProfileCard({ profile, sellerName }: SellerProfileCardProps) {
  const trustLevel = profile
    ? getTrustLevel(profile)
    : 'unverified'

  const badge = trustBadge[trustLevel]

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Seller Info</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text)]">
            {sellerName ?? 'Anonymous Seller'}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        {profile && (
          <>
            <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
              <span>{profile.totalSales} sale{profile.totalSales !== 1 ? 's' : ''}</span>
              {profile.averageRating !== null && profile.ratingCount > 0 && (
                <span>
                  {profile.averageRating.toFixed(1)} / 5.0 ({profile.ratingCount} review{profile.ratingCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>

            {profile.isVerified && (
              <p className="text-xs text-green-600">Identity verified</p>
            )}

            <p className="text-xs text-[var(--color-text-muted)]">
              Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </>
        )}

        {!profile && (
          <p className="text-xs text-[var(--color-text-muted)]">No seller profile yet.</p>
        )}
      </div>
    </div>
  )
}
