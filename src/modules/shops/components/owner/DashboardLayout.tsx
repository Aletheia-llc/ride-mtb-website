import Link from 'next/link'
import type { ShopStatus } from '@/generated/prisma/client'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  CLAIMED: 'Claimed',
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  CLAIMED: 'bg-blue-100 text-blue-800',
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
}

const TABS = [
  { href: 'edit', label: 'Edit Info' },
  { href: 'photos', label: 'Photos' },
  { href: 'reviews', label: 'Reviews' },
  { href: 'analytics', label: 'Analytics' },
]

interface Props {
  shopName: string
  shopSlug: string
  shopStatus: ShopStatus
  activeTab: string
  children: React.ReactNode
}

export function DashboardLayout({ shopName, shopSlug, shopStatus, activeTab, children }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">{shopName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[shopStatus] ?? ''}`}>
              {STATUS_LABELS[shopStatus] ?? shopStatus}
            </span>
            <Link
              href={`/shops/${shopSlug}`}
              target="_blank"
              className="text-xs text-[var(--color-text-muted)] hover:underline"
            >
              View public listing ↗
            </Link>
          </div>
        </div>
      </div>

      <nav className="mb-8 flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`/shops/${shopSlug}/manage/${tab.href}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.href
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  )
}
