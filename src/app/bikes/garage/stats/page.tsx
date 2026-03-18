// src/app/bikes/garage/stats/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports -- server component, direct module import is intentional
import { getBikeStats } from '@/modules/bikes/lib/garage-queries'
import { StatsClient } from './StatsClient'

export const metadata: Metadata = {
  title: 'Garage Stats | Ride MTB',
}

export default async function GarageStatsPage() {
  const user = await requireAuth()
  const stats = await getBikeStats(user.id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/bikes/garage"
          className="flex items-center gap-1 transition-colors hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          My Garage
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Stats</span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold text-[var(--color-text)]">Garage Stats</h1>

      <StatsClient stats={stats} />
    </div>
  )
}
