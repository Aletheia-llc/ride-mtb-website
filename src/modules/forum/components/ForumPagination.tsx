'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface Props {
  currentPage: number
  pageCount: number
}

export function ForumPagination({ currentPage, pageCount }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    return `${pathname}?${params.toString()}`
  }

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)

  return (
    <nav className="mt-8 flex items-center justify-center gap-1">
      {currentPage > 1 && (
        <Link
          href={buildHref(currentPage - 1)}
          className="rounded-md px-3 py-1.5 text-sm hover:bg-[var(--color-surface)]"
        >
          ←
        </Link>
      )}
      {pages.map((page) => (
        <Link
          key={page}
          href={buildHref(page)}
          className={[
            'rounded-md px-3 py-1.5 text-sm',
            page === currentPage
              ? 'bg-[var(--color-primary)] text-white'
              : 'hover:bg-[var(--color-surface)] text-[var(--color-text-muted)]',
          ].join(' ')}
        >
          {page}
        </Link>
      ))}
      {currentPage < pageCount && (
        <Link
          href={buildHref(currentPage + 1)}
          className="rounded-md px-3 py-1.5 text-sm hover:bg-[var(--color-surface)]"
        >
          →
        </Link>
      )}
    </nav>
  )
}
