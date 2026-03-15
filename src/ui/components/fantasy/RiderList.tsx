'use client'

import { useState } from 'react'
import { formatPrice } from '@/modules/fantasy/lib/pricing'

interface RiderRow {
  riderId: string
  name: string
  nationality: string
  gender: 'male' | 'female'
  marketPriceCents: number
  isWildcardEligible: boolean
  fantasyPoints: number | null
  isOnTeam: boolean
}

export function RiderList({
  riders,
  onSelect,
}: {
  riders: RiderRow[]
  onSelect: (riderId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [wildcardOnly, setWildcardOnly] = useState(false)

  const filtered = riders.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (genderFilter !== 'all' && r.gender !== genderFilter) return false
    if (wildcardOnly && !r.isWildcardEligible) return false
    return true
  })

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="p-3 border-b border-[var(--color-border)] space-y-2">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search riders..."
          className="w-full border border-[var(--color-border)] rounded px-3 py-1.5 text-sm bg-[var(--color-bg)]"
        />
        <div className="flex gap-3 text-xs">
          <select value={genderFilter} onChange={e => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
            className="border border-[var(--color-border)] rounded px-2 py-1 bg-[var(--color-bg)]">
            <option value="all">All</option>
            <option value="male">Men</option>
            <option value="female">Women</option>
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={wildcardOnly} onChange={e => setWildcardOnly(e.target.checked)} />
            Wildcard only
          </label>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--color-bg-secondary)]">
            <tr className="text-xs text-[var(--color-text-muted)] text-left">
              <th className="py-2 px-3">Rider</th>
              <th className="py-2 px-3 text-right">Price</th>
              <th className="py-2 px-3 text-right hidden md:table-cell">Pts</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.riderId}
                className={`border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] cursor-pointer ${r.isOnTeam ? 'opacity-50' : ''}`}
                onClick={() => !r.isOnTeam && onSelect(r.riderId)}>
                <td className="py-2 px-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {r.nationality}
                    {r.isWildcardEligible && <span className="ml-1 text-amber-600">⭐WC</span>}
                  </p>
                </td>
                <td className="py-2 px-3 text-right font-mono text-xs">{formatPrice(r.marketPriceCents)}</td>
                <td className="py-2 px-3 text-right text-[var(--color-text-muted)] hidden md:table-cell">
                  {r.fantasyPoints ?? '—'}
                </td>
                <td className="py-2 px-3">
                  {r.isOnTeam
                    ? <span className="text-xs text-green-600">✓</span>
                    : <span className="text-xs text-blue-600">+</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
