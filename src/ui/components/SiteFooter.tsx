import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-[var(--color-dim)]">
        <span>© {new Date().getFullYear()} Ride MTB. All rights reserved.</span>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-[var(--color-text)] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-text)] transition-colors">
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  )
}
