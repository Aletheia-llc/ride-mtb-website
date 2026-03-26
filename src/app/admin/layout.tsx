import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Admin | Ride MTB',
  description: 'Admin dashboard for Ride MTB',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
        <Link href="/admin" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Dashboard</Link>
        <Link href="/admin/users" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Users</Link>
        <Link href="/admin/creators" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Creators</Link>
        <Link href="/admin/creators/campaigns" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Campaigns</Link>
        <Link href="/admin/creators/payouts" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Payouts</Link>
        <Link href="/admin/news" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">News</Link>
        <Link href="/admin/coaching" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Coaching</Link>
        <Link href="/admin/affiliate" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Affiliate</Link>
        <Link href="/admin/fantasy/series" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Fantasy</Link>
        <Link href="/admin/parks" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Parks</Link>
        <Link href="/admin/trails" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Trails</Link>
        <Link href="/forum/admin/reports" className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">Forum Reports</Link>
      </nav>
      {children}
    </div>
  )
}
