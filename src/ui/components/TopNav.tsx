import Link from 'next/link'
import { BookOpen, Map, MessageSquare, CalendarDays, Star, ShoppingBag, User, LogIn, Mail, Wallet, Bike, LayoutDashboard } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from './NotificationBell'
import type { Session } from 'next-auth'

const NAV_LINKS = [
  { label: 'Learn', href: '/learn', Icon: BookOpen },
  { label: 'Trails', href: '/trails', Icon: Map },
  { label: 'Forum', href: '/forum', Icon: MessageSquare },
  { label: 'Bikes', href: '/bikes', Icon: Bike },
  { label: 'Events', href: '/events', Icon: CalendarDays },
  { label: 'Reviews', href: '/reviews', Icon: Star },
  { label: 'Marketplace', href: '/marketplace', Icon: ShoppingBag },
]

interface TopNavProps {
  session: Session | null
}

export function TopNav({ session }: TopNavProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 items-center gap-4 px-4" style={{ maxWidth: 'var(--max-content-width)' }}>
        <Link href="/" className="font-bold text-base text-[var(--color-text)] shrink-0 mr-2">
          Ride <span className="text-[var(--color-primary)]">MTB</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {NAV_LINKS.map(({ label, href, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <Icon size={13} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <User size={14} />
                <span className="hidden sm:inline">{session.user.name ?? 'Profile'}</span>
              </Link>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              <LogIn size={13} />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
