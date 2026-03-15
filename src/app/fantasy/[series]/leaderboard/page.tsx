import { auth } from '@/lib/auth'
import { getSeriesHub } from '@/modules/fantasy/queries/getSeriesHub'
import { getGlobalLeaderboard } from '@/modules/fantasy/queries/getLeaderboard'
import { LeaderboardTable } from '@/ui/components/fantasy/LeaderboardTable'
import { notFound } from 'next/navigation'

export default async function LeaderboardPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const session = await auth()
  const seriesData = await getSeriesHub(series)
  if (!seriesData) notFound()

  const entries = await getGlobalLeaderboard(seriesData.id, seriesData.season)

  return (
    <div className="py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{seriesData.name} — Leaderboard</h1>
      {entries.length > 0
        ? <LeaderboardTable entries={entries} currentUserId={session?.user?.username ?? undefined} />
        : <p className="text-sm text-[var(--color-text-muted)]">No scores yet. Standings will appear after the first event is scored.</p>
      }
    </div>
  )
}
