import { requireAdmin } from '@/lib/auth/guards'
import { getAdminDashboard } from '@/modules/marketplace/actions/admin'
import Link from 'next/link'
import { LayoutDashboard, List, AlertTriangle, Flag, Users, CreditCard } from 'lucide-react'

export const metadata = {
  title: 'Marketplace Admin | Ride MTB',
}

export default async function MarketplaceAdminPage() {
  await requireAdmin()

  const stats = await getAdminDashboard()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Marketplace Admin
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Overview of marketplace activity
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Pending Review
          </p>
          <p className="mt-1 text-3xl font-bold text-amber-500">
            {stats.pendingListings}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Active Listings
          </p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-primary)]">
            {stats.activeListings}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Open Reports
          </p>
          <p className="mt-1 text-3xl font-bold text-red-500">
            {stats.openReports}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Transactions
          </p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">
            {stats.totalTransactions}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: '/buy-sell/admin/review-queue', icon: AlertTriangle, label: 'Review Queue', desc: 'Approve or remove pending listings' },
          { href: '/buy-sell/admin/listings', icon: List, label: 'All Listings', desc: 'Browse and manage all listings' },
          { href: '/buy-sell/admin/reports', icon: Flag, label: 'Reports', desc: 'Review flagged content' },
          { href: '/buy-sell/admin/sellers', icon: Users, label: 'Sellers', desc: 'Manage seller profiles and trust' },
          { href: '/buy-sell/admin/transactions', icon: CreditCard, label: 'Transactions', desc: 'View all payment transactions' },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-primary)]/40"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
