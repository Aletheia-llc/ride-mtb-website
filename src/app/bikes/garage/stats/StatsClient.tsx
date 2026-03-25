// src/app/bikes/garage/stats/StatsClient.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/ui/components'
import type { BikeStats } from '@/modules/bikes/lib/garage-queries'

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280', '#14b8a6',
]

export function StatsClient({ stats }: { stats: BikeStats }) {
  const [tab, setTab] = useState<'overview' | 'costs' | 'components'>('overview')

  const sortedBrands = Object.entries(stats.brandCounts).sort((a, b) => b[1] - a[1])
  const sortedCategories = Object.entries(stats.categorySpending).sort((a, b) => b[1] - a[1])
  const sortedComponentBrands = Object.entries(stats.componentBrandSpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxBrandCount = Math.max(1, ...sortedBrands.map(([, c]) => c))
  const maxCategorySpend = Math.max(1, ...sortedCategories.map(([, v]) => v))
  const maxComponentBrandSpend = Math.max(1, ...sortedComponentBrands.map(([, v]) => v))
  const maxBikeCost = Math.max(
    1,
    ...stats.bikeBreakdown.map(b => b.purchasePriceDollars + b.componentCostDollars),
  )

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'costs' as const, label: 'Costs' },
    { id: 'components' as const, label: 'Components' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div role="tablist" aria-label="Stats sections" className="mb-6 flex w-fit gap-0.5 rounded-lg border border-[var(--color-border)] p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={[
              'rounded px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs text-[var(--color-text-muted)]">Bikes</p>
              <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{stats.bikeCount}</p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--color-text-muted)]">Total Investment</p>
              <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">
                ${Math.round(stats.totalInvestmentDollars).toLocaleString()}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--color-text-muted)]">Components</p>
              <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{stats.totalComponents}</p>
            </Card>
          </div>

          {sortedBrands.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">Brands</h2>
              <div className="space-y-2.5">
                {sortedBrands.map(([brand, count]) => (
                  <div key={brand}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-[var(--color-text-muted)]">{brand}</span>
                      <span className="font-medium text-[var(--color-text)]">
                        {count} {count === 1 ? 'bike' : 'bikes'}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${Math.round((count / maxBrandCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.bikeCount === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              No bikes in your garage yet.{' '}
              <Link href="/bikes/garage/new" className="text-[var(--color-primary)]">Add your first bike</Link>
            </p>
          )}
        </div>
      )}

      {tab === 'costs' && (
        <div className="space-y-6">
          {stats.bikeBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No bikes in your garage yet.</p>
          ) : (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">Cost by Bike</h2>
              <div className="space-y-4">
                {stats.bikeBreakdown.map(bike => {
                  const total = bike.purchasePriceDollars + bike.componentCostDollars
                  return (
                    <div key={bike.id}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[var(--color-text-muted)]">
                          {bike.brand} {bike.name}
                        </span>
                        <span className="font-medium text-[var(--color-text)]">
                          ${Math.round(total).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex h-4 overflow-hidden rounded-full bg-[var(--color-border)]">
                        {bike.purchasePriceDollars > 0 && (
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${Math.round((bike.purchasePriceDollars / maxBikeCost) * 100)}%` }}
                            title={`Purchase: $${bike.purchasePriceDollars}`}
                          />
                        )}
                        {bike.componentCostDollars > 0 && (
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${Math.round((bike.componentCostDollars / maxBikeCost) * 100)}%` }}
                            title={`Components: $${Math.round(bike.componentCostDollars)}`}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex gap-4 text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />
                  Purchase
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-3 rounded-sm bg-blue-500" />
                  Components
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'components' && (
        <div className="space-y-6">
          {sortedCategories.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
                Spending by Category
              </h2>
              <div className="space-y-2.5">
                {sortedCategories.map(([category, total], i) => (
                  <div key={category}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="capitalize text-[var(--color-text-muted)]">
                        {category.toLowerCase()}
                      </span>
                      <span className="font-medium text-[var(--color-text)]">
                        ${Math.round(total).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((total / maxCategorySpend) * 100)}%`,
                          backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedComponentBrands.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
                Top Component Brands by Spend
              </h2>
              <div className="space-y-2.5">
                {sortedComponentBrands.map(([brand, total]) => (
                  <div key={brand}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-[var(--color-text-muted)]">{brand}</span>
                      <span className="font-medium text-[var(--color-text)]">
                        ${Math.round(total).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${Math.round((total / maxComponentBrandSpend) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedCategories.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              No component costs recorded yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
