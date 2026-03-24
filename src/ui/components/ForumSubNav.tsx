'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PenSquare } from 'lucide-react'
import { NotificationBell } from '@/modules/forum/components/NotificationBell'

export function ForumSubNav() {
  const pathname = usePathname()
  const isThreadDetail = pathname.startsWith('/forum/thread/')

  return (
    <nav className="sticky top-14 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        {isThreadDetail ? (
          <div className="text-sm text-[var(--color-text-muted)]">
            <Link href="/forum" className="hover:text-[var(--color-text)]">Forum</Link>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <Link
            href="/forum/new"
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <PenSquare className="h-3.5 w-3.5" />
            New Thread
          </Link>
        </div>
      </div>
    </nav>
  )
}
