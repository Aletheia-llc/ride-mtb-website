'use client'

import { useState, useCallback } from 'react'
import { FeedCard } from './FeedCard'
import { FeedBanner } from './HeroSection'
import type { FeedResponse, FeedTab } from '../types'

const TAB_LABELS: Record<FeedTab, { loggedIn: string; loggedOut: string }> = {
  forYou: { loggedIn: 'For You', loggedOut: 'Trending' },
  latest: { loggedIn: 'Latest', loggedOut: 'Latest' },
  popular: { loggedIn: 'Popular', loggedOut: 'Popular' },
}

interface FeedClientProps {
  initialItems: FeedResponse['items']
  initialHasMore: boolean
  initialCursor: string | null
  isLoggedIn: boolean
}

export function FeedClient({ initialItems, initialHasMore, initialCursor, isLoggedIn }: FeedClientProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou')
  const [items, setItems] = useState(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)

  const switchTab = useCallback(async (tab: FeedTab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setLoading(true)
    try {
      const res = await fetch(`/api/feed?tab=${tab}`)
      const data: FeedResponse = await res.json()
      setItems(data.items)
      setHasMore(data.hasMore)
      setCursor(data.nextCursor)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ tab: activeTab })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`/api/feed?${params}`)
      const data: FeedResponse = await res.json()
      setItems((prev) => [...prev, ...data.items])
      setHasMore(data.hasMore)
      setCursor(data.nextCursor)
    } finally {
      setLoading(false)
    }
  }, [activeTab, cursor, hasMore, loading])

  const handleCardClick = useCallback(async (type: string) => {
    const TYPE_TO_CATEGORY: Record<string, string> = {
      trail: 'trail',
      forum: 'forum',
      event: 'events',
      review: 'reviews',
      buysell: 'buysell',
      course: 'learn',
    }
    const category = TYPE_TO_CATEGORY[type] ?? type
    const INCREMENT: Record<string, number> = { learn: 2, trail: 1, forum: 1, events: 1, reviews: 1, buysell: 1 }
    const increment = INCREMENT[category] ?? 1

    await fetch('/api/feed/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, increment }),
    }).catch(() => {})
  }, [])

  const tabs: FeedTab[] = ['forYou', 'latest', 'popular']

  return (
    <div>
      {!isLoggedIn && <FeedBanner />}

      <div className="flex border-b border-[var(--color-border)] mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {isLoggedIn ? TAB_LABELS[tab].loggedIn : TAB_LABELS[tab].loggedOut}
          </button>
        ))}
      </div>

      <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
        {items.map((item) => (
          <FeedCard
            key={item.id}
            {...item}
            onClickCapture={() => handleCardClick(item.type)}
          />
        ))}
      </div>

      {items.length === 0 && !loading && (
        <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">No content yet.</p>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full mt-4 py-2 text-sm text-[var(--color-primary)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
