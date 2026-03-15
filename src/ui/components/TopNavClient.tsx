'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen, Map, MessageSquare,
  ShoppingBag, User, LogIn, Mail, Wallet, Bike, LayoutDashboard,
  ChevronDown, Search, Heart,
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from './NotificationBell'
import { MegaNavPanel } from './MegaNav/MegaNavPanel'
import { MEGA_NAV_CONFIG } from './MegaNav/megaNavConfig'
import { SearchModal } from './SearchModal'
import type { Session } from 'next-auth'

const NAV_LINKS: { label: string; href: string; Icon: React.ComponentType<{ size?: number }>; megaKey: string | null }[] = [
  { label: 'Learn', href: '/learn', Icon: BookOpen, megaKey: 'learn' },
  { label: 'Trails', href: '/trails', Icon: Map, megaKey: 'trails' },
  { label: 'Forum', href: '/forum', Icon: MessageSquare, megaKey: 'forum' },
  { label: 'Bikes', href: '/bikes', Icon: Bike, megaKey: 'bikes' },
  { label: 'Marketplace', href: '/marketplace', Icon: ShoppingBag, megaKey: 'marketplace' },
]

interface TopNavClientProps {
  session: Session | null
}

export function TopNavClient({ session }: TopNavClientProps) {
  const [activeNav, setActiveNav] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const startCloseTimer = () => {
    clearTimer()
    timerRef.current = setTimeout(() => setActiveNav(null), 200)
  }

  useEffect(() => () => clearTimer(), [])

  useEffect(() => {
    if (!activeNav) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveNav(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [activeNav])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="relative sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 items-center gap-4 px-4" style={{ maxWidth: 'var(--max-content-width)' }}>
          <Link href="/" className="mr-2 shrink-0 text-lg font-extrabold text-[var(--color-text)]">
            Ride <span className="text-[var(--color-primary)]">MTB</span>
          </Link>

          <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, href, Icon, megaKey }) => {
              const isActive = megaKey !== null && activeNav === megaKey
              return (
                <div
                  key={href}
                  className="relative"
                  onMouseEnter={() => {
                    clearTimer()
                    if (megaKey) setActiveNav(megaKey)
                  }}
                  onMouseLeave={() => {
                    if (megaKey) startCloseTimer()
                  }}
                >
                  <Link
                    href={href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-primary)]'
                        : 'rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                    {megaKey && (
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-150 ${isActive ? 'rotate-180' : ''}`}
                      />
                    )}
                  </Link>
                </div>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex h-8 w-8 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
            >
              <Search size={16} />
            </button>
            <ThemeToggle />
            <Link
              href="/donate"
              className="hidden sm:flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#22c55e' }}
            >
              <Heart size={11} />
              Support
            </Link>
            {session?.user?.id && (
              <>
                <Link
                  href="/wallet"
                  aria-label="Wallet"
                  className="flex h-8 w-8 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
                >
                  <Wallet size={16} />
                </Link>
                <Link
                  href="/messages"
                  aria-label="Messages"
                  className="flex h-8 w-8 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
                >
                  <Mail size={16} />
                </Link>
                <NotificationBell userId={session.user.id} />
              </>
            )}
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
                >
                  <LayoutDashboard size={14} />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
                >
                  <User size={14} />
                  <span className="hidden sm:inline">{session.user.name ?? 'Profile'}</span>
                </Link>
              </>
            ) : (
              <Link
                href="/signin"
                className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white transition-colors"
                style={{ background: 'var(--color-primary)' }}
              >
                <LogIn size={13} />
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mega-nav panel — renders inside header so absolute positioning anchors correctly */}
        {activeNav && MEGA_NAV_CONFIG[activeNav] && (
          <MegaNavPanel
            entry={MEGA_NAV_CONFIG[activeNav]}
            onMouseEnter={clearTimer}
            onMouseLeave={startCloseTimer}
          />
        )}
      </header>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  )
}
