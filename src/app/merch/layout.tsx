import Link from 'next/link'
import { flags } from '@/lib/flags'
import { notFound } from 'next/navigation'
import { CartIcon } from '@/modules/merch/components/CartIcon'

const NAV_LINKS = [
  { href: '/merch', label: 'Shop' },
  { href: '/merch/drops', label: 'Drops' },
  { href: '/merch/contests', label: 'Contests' },
]

export default function MerchLayout({ children }: { children: React.ReactNode }) {
  if (!flags.merch) notFound()
  return (
    <>
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between h-12">
            <nav className="flex gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors rounded"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <CartIcon />
          </div>
        </div>
      </div>
      {children}
    </>
  )
}
