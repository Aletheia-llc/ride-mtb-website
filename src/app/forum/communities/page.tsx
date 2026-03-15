import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Users, Crown, Lock, Plus, Search } from 'lucide-react'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getForumCommunities, getUserForumMemberships } from '@/modules/forum/lib/queries'
// eslint-disable-next-line no-restricted-imports
import { CommunityJoinButton } from '@/modules/forum/components/CommunityJoinButton'

export const metadata: Metadata = {
  title: 'Communities | Ride MTB Forum',
  description: 'Discover gated communities on Ride MTB. Join exclusive groups for premium content.',
}

const SORT_OPTIONS = ['popular', 'newest'] as const
type SortOption = (typeof SORT_OPTIONS)[number]

interface CommunitiesPageProps {
  searchParams: Promise<{ q?: string; sort?: string }>
}

export default async function ForumCommunitiesPage({ searchParams }: CommunitiesPageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const sort: SortOption = SORT_OPTIONS.includes(params.sort as SortOption)
    ? (params.sort as SortOption)
    : 'popular'

  const [session, communities] = await Promise.all([
    auth(),
    getForumCommunities({ q: query || undefined, sort }),
  ])

  const currentUserId = session?.user?.id ?? null
  const currentUserRole = (session?.user as { role?: string } | undefined)?.role ?? null
  const canCreate = currentUserRole === 'admin' || currentUserRole === 'instructor'

  const membershipSet = currentUserId
    ? await getUserForumMemberships(currentUserId)
    : new Set<string>()

  function sortUrl(s: SortOption) {
    const qs = new URLSearchParams()
    if (query) qs.set('q', query)
    if (s !== 'popular') qs.set('sort', s)
    const str = qs.toString()
    return `/forum/communities${str ? `?${str}` : ''}`
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--color-text)]">
          <Lock className="h-6 w-6" />
          Discover Communities
        </h1>
        {canCreate && (
          <Link
            href="/forum/communities/create"
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            <Plus className="h-4 w-4" />
            Create Community
          </Link>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <form method="GET" action="/forum/communities" className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
          {sort !== 'popular' && <input type="hidden" name="sort" value={sort} />}
          <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search communities..."
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none"
          />
          <button type="submit" className="shrink-0 rounded-md bg-[var(--color-bg-secondary)] px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]">
            Search
          </button>
        </form>

        <div className="flex gap-1">
          {SORT_OPTIONS.map((option) => (
            <Link
              key={option}
              href={sortUrl(option)}
              className={[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                sort === option
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
      {communities.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-24 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
          <p className="text-lg font-semibold text-[var(--color-text)]">No communities found</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {query ? `No results for "${query}". Try a different search.` : 'Be the first to create a community!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => {
            const isMember = membershipSet.has(community.id)
            return (
              <div key={community.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] transition-all hover:border-[var(--color-text-muted)] hover:shadow-md">
                {/* Cover */}
                {community.coverImageUrl ? (
                  <div className="relative h-28 overflow-hidden">
                    <Image src={community.coverImageUrl} alt="" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div
                    className="flex h-28 items-center justify-center"
                    style={{ backgroundColor: community.color ?? 'var(--color-primary)' }}
                  >
                    <Crown className="h-10 w-10 text-white/60" />
                  </div>
                )}

                {/* Body */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-1 flex items-center gap-1.5">
                    <h2 className="font-semibold text-[var(--color-text)]">{community.name}</h2>
                    <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
                  </div>

                  {community.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                      {community.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                      </span>
                      {community.owner?.username && (
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          {community.owner.username}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/forum/${community.slug}`}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                      >
                        View
                      </Link>
                      {currentUserId && (
                        <CommunityJoinButton
                          categoryId={community.id}
                          initialMember={isMember}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
