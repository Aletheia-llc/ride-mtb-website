'use client'
import Link from 'next/link'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'components', label: 'Components' },
  { key: 'build-log', label: 'Build Log' },
  { key: 'maintenance', label: 'Maintenance' },
]

export function BikeTabs({ bikeId, activeTab }: { bikeId: string; activeTab: string }) {
  return (
    <div className="flex gap-1 border-b border-[var(--color-border)]">
      {TABS.map(tab => (
        <Link
          key={tab.key}
          href={`/bikes/garage/${bikeId}?tab=${tab.key}`}
          className={[
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === tab.key
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
          ].join(' ')}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
