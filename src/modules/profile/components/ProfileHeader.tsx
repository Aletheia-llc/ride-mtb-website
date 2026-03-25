import Link from 'next/link'
import { Avatar, Badge } from '@/ui/components'
import type { UserProfileData } from '../types'
import { getSkillBadgeVariant, getRoleBadgeVariant } from '../types'
import { MapPin, Calendar, ExternalLink } from 'lucide-react'

interface ProfileHeaderProps {
  user: UserProfileData
  isOwnProfile?: boolean
}

export function ProfileHeader({ user, isOwnProfile = false }: ProfileHeaderProps) {
  const displayName = user.name || user.username || 'Anonymous'
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <Avatar
        src={user.avatarUrl || user.image}
        alt={displayName}
        size="lg"
        className="h-20 w-20 text-2xl"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {displayName}
          </h1>
          {user.role !== 'user' && (
            <Badge variant={getRoleBadgeVariant(user.role)}>
              {user.role}
            </Badge>
          )}
          {user.skillLevel && (
            <Badge variant={getSkillBadgeVariant(user.skillLevel)}>
              {user.skillLevel}
            </Badge>
          )}
        </div>

        {user.username && (
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            @{user.username}
          </p>
        )}

        {user.bio && (
          <p className="mt-2 text-sm text-[var(--color-text)]">
            {user.bio}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
          {user.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {user.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Member since {memberSince}
          </span>
          {user.websiteUrl && (
            <a
              href={user.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[var(--color-primary)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Website
            </a>
          )}
        </div>

        {user.ridingStyle && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            <span className="font-medium">Riding style:</span> {user.ridingStyle}
            {user.yearStartedRiding != null && (() => {
              const yrs = new Date().getFullYear() - user.yearStartedRiding
              return yrs > 0 ? (
                <> &middot; {yrs} {yrs === 1 ? 'year' : 'years'} riding</>
              ) : null
            })()}
          </p>
        )}

        {(user.favoriteBike || user.favoriteTrail) && (
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {user.favoriteBike && (
              <><span className="font-medium">Bike:</span> {user.favoriteBike}</>
            )}
            {user.favoriteBike && user.favoriteTrail && <> &middot; </>}
            {user.favoriteTrail && (
              <><span className="font-medium">Trail:</span> {user.favoriteTrail}</>
            )}
          </p>
        )}

        {isOwnProfile && (
          <div className="mt-4">
            <Link
              href="/profile/settings"
              className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              Edit Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
