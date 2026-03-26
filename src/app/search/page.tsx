import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MessageSquare, Tag, Users } from 'lucide-react'
import { Card } from '@/ui/components'
// eslint-disable-next-line no-restricted-imports
import {
  searchThreads,
  searchListings,
  searchMembers,
  getGlobalSearchCounts,
} from '@/lib/search/queries'

export const metadata: Metadata = {
  title: 'Search | Ride MTB',
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    tab?: string
  }>
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'threads', label: 'Threads', icon: MessageSquare },
  { key: 'listings', label: 'Listings', icon: Tag },
  { key: 'members', label: 'Members', icon: Users },
]

function truncate(text: string, maxLen = 120): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen).trimEnd() + '…'
}

function UserAvatar({ name, image, avatarUrl, size = 36 }: {
  name: string | null
  image: string | null
  avatarUrl: string | null
  size?: number
}) {
  const src = avatarUrl ?? image
  const initials = (name ?? '?')[0].toUpperCase()
  if (src) {
    return (
      <Image
        src={src}
        alt={name ?? 'User'}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const tab = TABS.find((t) => t.key === params.tab)?.key ?? 'all'

  if (!query) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Search className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
        <h1 className="mb-2 text-xl font-bold text-[var(--color-text)]">Search Ride MTB</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Find forum threads, marketplace listings, and members.
        </p>
      </div>
    )
  }

  const [counts, threads, listings, members] = await Promise.all([
    getGlobalSearchCounts(query),
    (tab === 'all' || tab === 'threads') ? searchThreads(query) : Promise.resolve([]),
    (tab === 'all' || tab === 'listings') ? searchListings(query) : Promise.resolve([]),
    (tab === 'all' || tab === 'members') ? searchMembers(query) : Promise.resolve([]),
  ])

  const totalResults = counts.threads + counts.listings + counts.members

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text)]">
          {totalResults === 0 ? 'No results for ' : 'Results for '}
          <span className="text-[var(--color-primary)]">&ldquo;{query}&rdquo;</span>
        </h1>
        {totalResults > 0 && (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {totalResults.toLocaleString()} result{totalResults === 1 ? '' : 's'} across all sections
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map((t) => {
          const count = t.key === 'all'
            ? totalResults
            : t.key === 'threads'
            ? counts.threads
            : t.key === 'listings'
            ? counts.listings
            : counts.members
          return (
            <Link
              key={t.key}
              href={`/search?q=${encodeURIComponent(query)}&tab=${t.key}`}
              className={[
                'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {t.label}
              <span className="rounded-full bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-[10px]">
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {totalResults === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-[var(--color-text-muted)]" />
            <p className="font-medium text-[var(--color-text)]">No results found</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Try different keywords or check the spelling.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Threads section */}
          {(tab === 'all' || tab === 'threads') && threads.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  <MessageSquare className="h-4 w-4 text-[var(--color-primary)]" />
                  Forum Threads
                  <span className="text-[var(--color-text-muted)]">({counts.threads})</span>
                </h2>
                {tab === 'all' && counts.threads > threads.length && (
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}&tab=threads`}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    View all {counts.threads}
                  </Link>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                {threads.map((thread, i) => (
                  <Link
                    key={thread.id}
                    href={`/forum/thread/${thread.slug}`}
                    className={[
                      'block px-4 py-3 hover:bg-[var(--color-bg-secondary)] transition-colors',
                      i > 0 ? 'border-t border-[var(--color-border)]' : '',
                    ].join(' ')}
                  >
                    <p className="font-medium text-[var(--color-text)] line-clamp-1">{thread.title}</p>
                    <p className="mt-0.5 text-sm text-[var(--color-text-muted)] line-clamp-2">
                      {truncate(thread.body)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      <span>{thread.category?.name}</span>
                      <span>·</span>
                      <span>by {thread.author.username ?? thread.author.name ?? 'unknown'}</span>
                      <span>·</span>
                      <span>{thread._count.comments} repl{thread._count.comments === 1 ? 'y' : 'ies'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Listings section */}
          {(tab === 'all' || tab === 'listings') && listings.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  <Tag className="h-4 w-4 text-[var(--color-primary)]" />
                  Marketplace
                  <span className="text-[var(--color-text-muted)]">({counts.listings})</span>
                </h2>
                {tab === 'all' && counts.listings > listings.length && (
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}&tab=listings`}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    View all {counts.listings}
                  </Link>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                {listings.map((listing, i) => (
                  <Link
                    key={listing.id}
                    href={`/buy-sell/${listing.slug}`}
                    className={[
                      'flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-secondary)] transition-colors',
                      i > 0 ? 'border-t border-[var(--color-border)]' : '',
                    ].join(' ')}
                  >
                    {listing.photos[0] ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={listing.photos[0].url}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)]">
                        <Tag className="h-5 w-5 text-[var(--color-text-muted)]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--color-text)] line-clamp-1">{listing.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <span className="font-semibold text-[var(--color-text)]">
                          ${listing.price.toLocaleString()}
                        </span>
                        <span>·</span>
                        <span>{listing.condition.replace(/_/g, ' ')}</span>
                        {listing.location && (
                          <>
                            <span>·</span>
                            <span>{listing.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Members section */}
          {(tab === 'all' || tab === 'members') && members.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                  <Users className="h-4 w-4 text-[var(--color-primary)]" />
                  Members
                  <span className="text-[var(--color-text-muted)]">({counts.members})</span>
                </h2>
                {tab === 'all' && counts.members > members.length && (
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}&tab=members`}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    View all {counts.members}
                  </Link>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                {members.map((member, i) => (
                  <Link
                    key={member.id}
                    href={member.username ? `/forum/user/${member.username}` : `/profile`}
                    className={[
                      'flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-secondary)] transition-colors',
                      i > 0 ? 'border-t border-[var(--color-border)]' : '',
                    ].join(' ')}
                  >
                    <UserAvatar
                      name={member.name}
                      image={member.image}
                      avatarUrl={member.avatarUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--color-text)]">
                        {member.name ?? member.username ?? 'Unknown'}
                      </p>
                      {member.username && (
                        <p className="text-xs text-[var(--color-text-muted)]">@{member.username}</p>
                      )}
                      {member.bio && (
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)] line-clamp-1">
                          {member.bio}
                        </p>
                      )}
                    </div>
                    {member.role !== 'user' && (
                      <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--color-primary)]">
                        {member.role}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
