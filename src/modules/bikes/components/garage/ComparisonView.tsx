// src/modules/bikes/components/garage/ComparisonView.tsx
'use client'

import Link from 'next/link'
import type { BikeCompareData } from '@/modules/bikes/lib/garage-queries'

const CATEGORY_LABELS: Record<string, string> = {
  gravel: 'Gravel', xc: 'XC', trail: 'Trail', enduro: 'Enduro',
  downhill: 'Downhill', dirt_jump: 'Dirt Jump', ebike: 'E-Bike', other: 'Other',
}

function bestIndex(values: (number | null)[], prefer: 'min' | 'max'): number | null {
  const indexed = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v !== null)
  if (indexed.length < 2) return null
  const best = prefer === 'min'
    ? indexed.reduce((a, b) => a.v < b.v ? a : b)
    : indexed.reduce((a, b) => a.v > b.v ? a : b)
  // If multiple values equal the best, return null (tie — no highlight)
  const tieCount = indexed.filter(x => x.v === best.v).length
  return tieCount > 1 ? null : best.i
}

interface Row {
  label: string
  render: (b: BikeCompareData) => string | null
  rawValue?: (b: BikeCompareData) => number | null
  prefer?: 'min' | 'max'
}

const ROWS: Row[] = [
  { label: 'Brand', render: b => b.brand },
  { label: 'Year', render: b => b.year?.toString() ?? null, rawValue: b => b.year, prefer: 'max' },
  { label: 'Category', render: b => b.category ? (CATEGORY_LABELS[b.category] ?? b.category) : null },
  { label: 'Wheel Size', render: b => b.wheelSize },
  { label: 'Frame Size', render: b => b.frameSize },
  { label: 'Frame Material', render: b => b.frameMaterial },
  { label: 'Travel', render: b => b.travel != null ? `${b.travel}mm` : null, rawValue: b => b.travel, prefer: 'max' },
  { label: 'Frame Weight', render: b => b.frameWeightLbs != null ? `${b.frameWeightLbs} lbs` : null, rawValue: b => b.frameWeightLbs, prefer: 'min' },
  { label: 'Components', render: b => b.componentCount > 0 ? b.componentCount.toString() : null, rawValue: b => b.componentCount || null, prefer: 'max' },
  { label: 'Component Cost', render: b => b.componentCostDollars > 0 ? `$${Math.round(b.componentCostDollars).toLocaleString()}` : null, rawValue: b => b.componentCostDollars || null, prefer: 'min' },
  { label: 'Total Investment', render: b => b.totalInvestmentDollars > 0 ? `$${Math.round(b.totalInvestmentDollars).toLocaleString()}` : null, rawValue: b => b.totalInvestmentDollars || null, prefer: 'min' },
  { label: 'Purchase Year', render: b => b.purchaseYear?.toString() ?? null, rawValue: b => b.purchaseYear, prefer: 'max' },
]

export function ComparisonView({ bikes }: { bikes: BikeCompareData[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]" />
            {bikes.map(bike => (
              <th key={bike.id} className="px-4 py-3 text-left">
                <Link
                  href={`/bikes/garage/${bike.id}`}
                  className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
                >
                  {bike.brand} {bike.name}
                </Link>
                {bike.year && (
                  <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">
                    {bike.year}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(row => {
            const rendered = bikes.map(b => row.render(b))
            if (rendered.every(v => v === null)) return null

            const rawValues = row.rawValue ? bikes.map(b => row.rawValue!(b)) : []
            const best = row.prefer && rawValues.length > 0 ? bestIndex(rawValues, row.prefer) : null

            return (
              <tr key={row.label} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">
                  {row.label}
                </td>
                {bikes.map((bike, i) => (
                  <td
                    key={bike.id}
                    className={[
                      'px-4 py-3',
                      best === i
                        ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--color-text)]',
                    ].join(' ')}
                  >
                    {rendered[i] ?? (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
