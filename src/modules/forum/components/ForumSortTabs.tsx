'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Flame, Clock, TrendingUp } from 'lucide-react'

const TIME_OPTIONS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
] as const

export function ForumSortTabs() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const sort = (searchParams.get('sort') ?? 'hot') as 'hot' | 'new' | 'top'
  const timePeriod = (searchParams.get('t') ?? 'week') as 'day' | 'week' | 'month' | 'all'

  function setSort(newSort: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', newSort)
    params.delete('page')
    if (newSort !== 'top') params.delete('t')
    router.push(`${pathname}?${params.toString()}`)
  }

  function setTimePeriod(t: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('t', t)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const tabs = [
    { value: 'hot', label: 'Hot', icon: Flame },
    { value: 'new', label: 'New', icon: Clock },
    { value: 'top', label: 'Top', icon: TrendingUp },
  ]

  return (
    <div className="mb-4">
      <div className="flex gap-1">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSort(value)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              sort === value
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      {sort === 'top' && (
        <div className="mt-2 flex gap-1">
          {TIME_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimePeriod(value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                timePeriod === value
                  ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
