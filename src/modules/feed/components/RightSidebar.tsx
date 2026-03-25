// src/modules/feed/components/RightSidebar.tsx
import Link from 'next/link'
import { BookOpen, Map, MessageSquare, CalendarDays, Star, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AdSlot } from '@/ui/components/AdSlot'
import type { EventSummary } from '@/modules/events/types'

const MODULE_LINKS: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: 'Learn', href: '/learn', Icon: BookOpen },
  { label: 'Trails', href: '/trails', Icon: Map },
  { label: 'Forum', href: '/forum', Icon: MessageSquare },
  { label: 'Events', href: '/events', Icon: CalendarDays },
  { label: 'Reviews', href: '/reviews', Icon: Star },
  { label: 'Buy / Sell', href: '/buy-sell', Icon: ShoppingBag },
]

interface RightSidebarProps {
  upcomingEvents: EventSummary[]
}

export function RightSidebar({ upcomingEvents }: RightSidebarProps) {
  return (
    <aside className="flex flex-col gap-4">
      <AdSlot size="rectangle" />

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
