'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutList, Users, Bookmark } from 'lucide-react'
import { NotificationBell } from '@/modules/forum/components/NotificationBell'

const NAV_ITEMS = [
  { label: 'All Posts', href: '/forum', icon: LayoutList },
  { label: 'Communities', href: '/forum/communities', icon: Users },
  { label: 'Bookmarks', href: '/forum/bookmarks', icon: Bookmark },
] as const

export function ForumSubNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-14 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/forum' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>
    </nav>
  )
}
