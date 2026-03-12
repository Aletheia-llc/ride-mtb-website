// src/modules/feed/components/RightSidebar.tsx
import Link from 'next/link'
import { Suspense } from 'react'
import { BookOpen, Map, MessageSquare, CalendarDays, Star, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AdSlot } from '@/ui/components/AdSlot'
import type { EventSummary } from '@/modules/events/types'
// eslint-disable-next-line no-restricted-imports
import { XFeed } from './XFeed'

const MODULE_LINKS: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: 'Learn', href: '/learn', Icon: BookOpen },
  { label: 'Trails', href: '/trails', Icon: Map },
  { label: 'Forum', href: '/forum', Icon: MessageSquare },
  { label: 'Events', href: '/events', Icon: CalendarDays },
  { label: 'Reviews', href: '/reviews', Icon: Star },
  { label: 'Buy / Sell', href: '/marketplace', Icon: ShoppingBag },
]

interface RightSidebarProps {
  upcomingEvents: EventSummary[]
}

function XFeedSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3 animate-pulse">
      <div className="mb-3 h-3 w-20 rounded bg-[var(--color-bg-secondary)]" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="py-2.5 border-t border-[var(--color-border)] first:border-t-0 first:pt-0">
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-full bg-[var(--color-bg-secondary)]" />
            <div className="h-2.5 w-16 rounded bg-[var(--color-bg-secondary)]" />
            <div className="ml-auto h-2 w-6 rounded bg-[var(--color-bg-secondary)]" />
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full rounded bg-[var(--color-bg-secondary)]" />
            <div className="h-2 w-4/5 rounded bg-[var(--color-bg-secondary)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RightSidebar({ upcomingEvents }: RightSidebarProps) {
  return (
    <aside className="flex flex-col gap-4">
      <AdSlot size="rectangle" />

      <Suspense fallback={<XFeedSkeleton />}>
        <XFeed />
      </Suspense>

      <div className="rounded-lg p-3 border border-[var(--color-border)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Explore</p>
        <ul className="grid grid-cols-2 gap-1.5">
          {MODULE_LINKS.map(({ label, href, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-1.5 text-sm hover:text-[var(--color-primary)] py-1 px-2 rounded hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <Icon size={13} className="text-[var(--color-text-muted)]" /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {upcomingEvents.length > 0 && (
        <div className="rounded-lg p-3 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Upcoming Events</p>
            <Link href="/events" className="text-xs text-[var(--color-primary)]">See all</Link>
          </div>
          <ul className="flex flex-col gap-2">
            {upcomingEvents.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.slug}`} className="text-sm font-medium hover:text-[var(--color-primary)] leading-snug block">
                  {event.title}
                </Link>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {event.startDate.toLocaleDateString()} · {event.location}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
