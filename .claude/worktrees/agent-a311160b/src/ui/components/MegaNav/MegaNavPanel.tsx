'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { MegaNavEntry } from './megaNavConfig'

interface MegaNavPanelProps {
  entry: MegaNavEntry
  onMouseEnter: () => void
  onMouseLeave: () => void
  isLoggedIn?: boolean
}

export function MegaNavPanel({ entry, onMouseEnter, onMouseLeave }: MegaNavPanelProps) {
  const { featured, groups } = entry
  const FeaturedIcon = featured.icon

  return (
    <div
      className="absolute left-0 right-0 top-full z-40 hidden md:block"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="mx-auto w-fit border border-t-0 border-[var(--color-border)] rounded-b-xl bg-[var(--color-bg)] shadow-lg">
        <div
          className="grid gap-6 px-5 py-5"
          style={{
            gridTemplateColumns: `260px repeat(${groups.length}, 200px)`,
          }}
        >
          {/* Featured card */}
          <Link
            href={featured.href}
            className={`${featured.bgClass} flex flex-col gap-3 rounded-xl p-4 transition-opacity hover:opacity-80`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-bg)]/60">
              <FeaturedIcon className="h-5 w-5 text-[var(--color-text)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{featured.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
                {featured.description}
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-xs font-medium text-[var(--color-primary)]">
              {featured.ctaLabel}
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>

          {/* Link groups */}
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {group.label}
              </p>
              {group.links.map((link) => {
                const LinkIcon = link.icon
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
                  >
                    <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
