// src/app/fantasy/[series]/leaderboard/page.tsx
import { auth } from '@/lib/auth'
import { getSeriesHub } from '@/modules/fantasy/queries/getSeriesHub'
import { getGlobalLeaderboard } from '@/modules/fantasy/queries/getLeaderboard'
import { getChampionshipLeaderboard } from '@/modules/fantasy/queries/getChampionshipLeaderboard'
import { getManufacturerCupLeaderboard } from '@/modules/fantasy/queries/getManufacturerCupLeaderboard'
import { LeaderboardTable } from '@/ui/components/fantasy/LeaderboardTable'
import { ManufacturerCupTable } from '@/ui/components/fantasy/ManufacturerCupTable'
import { notFound } from 'next/navigation'

type Tab = 'global' | 'championship' | 'manufacturer'

interface PageProps {
  params: Promise<{ series: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function LeaderboardPage({ params, searchParams }: PageProps) {
  const { series } = await params
  const { tab } = await searchParams
  const activeTab: Tab =
    tab === 'championship' ? 'championship' : tab === 'manufacturer' ? 'manufacturer' : 'global'

  const session = await auth()
  const seriesData = await getSeriesHub(series)
  if (!seriesData) notFound()

  const [globalEntries, championshipEntries] = await Promise.all([
    getGlobalLeaderboard(seriesData.id, seriesData.season),
    getChampionshipLeaderboard(seriesData.id, seriesData.season),
  ])

  const mfrEntries =
    activeTab === 'manufacturer'
      ? await getManufacturerCupLeaderboard(seriesData.id, seriesData.season)
      : []

  const entries = activeTab === 'championship' ? championshipEntries : globalEntries

  return (
    <div className="py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{seriesData.name} — Leaderboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <a
          href={`/fantasy/${series}/leaderboard`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'global'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Global ({globalEntries.length})
        </a>
        <a
          href={`/fantasy/${series}/leaderboard?tab=championship`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'championship'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Championship ({championshipEntries.length})
        </a>
        <a
          href={`/fantasy/${series}/leaderboard?tab=manufacturer`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'manufacturer'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Manufacturer Cup
        </a>
      </div>

      {activeTab === 'championship' && championshipEntries.length === 0 && (
        <div className="border border-dashed border-[var(--color-border)] rounded-xl p-8 text-center space-y-2">
          <p className="font-semibold text-sm">Championship League</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Season pass holders are automatically entered. Standings appear after the first scored event.
          </p>
          <a
            href={`/fantasy/${series}/pass`}
            className="inline-block mt-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Get Season Pass — $29.99
          </a>
        </div>
      )}

      {activeTab === 'manufacturer' && (
        <ManufacturerCupTable
          entries={mfrEntries}
          currentUserId={session?.user?.id ?? undefined}
        />
      )}

      {activeTab !== 'manufacturer' && entries.length > 0 && (
        <LeaderboardTable
          entries={entries}
          currentUserId={session?.user?.id ?? undefined}
        />
      )}

      {activeTab === 'global' && entries.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          No scores yet. Standings will appear after the first event is scored.
        </p>
      )}
    </div>
  )
}
