'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { PenSquare, Search } from 'lucide-react'
import { NotificationBell } from '@/modules/forum/components/NotificationBell'

export function ForumSubNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const isThreadDetail = pathname.startsWith('/forum/thread/')
  const currentQuery = pathname === '/forum/search' ? (searchParams.get('q') ?? '') : ''

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    if (q) router.push(`/forum/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <nav className="sticky top-14 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        {isThreadDetail ? (
          <div className="text-sm text-[var(--color-text-muted)]">
            <Link href="/forum" className="hover:text-[var(--color-text)]">Forum</Link>
          </div>
        ) : (
          <form onSubmit={handleSearch} className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                ref={inputRef}
                type="search"
                name="q"
                defaultValue={currentQuery}
                placeholder="Search threads, replies, members…"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-1.5 pl-8 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30"
              />
            </div>
          </form>
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
