import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LearnLeaderboard } from '@/modules/learn'
// eslint-disable-next-line no-restricted-imports
import { getLeaderboard } from '@/modules/xp/lib/queries'

export const metadata: Metadata = {
  title: 'Leaderboard | Ride MTB Learn',
  description: 'See who is earning the most XP on Ride MTB.',
}

export const revalidate = 60 // ISR: revalidate every 60 seconds

export default async function LeaderboardPage() {
  const rawEntries = await getLeaderboard(50)

  const entries = rawEntries.map((entry, index) => ({
    rank: index + 1,
    user: entry.user,
    totalXp: entry.totalXp,
  }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Link href="/learn" className="hover:text-[var(--color-primary)]">
          Learn
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Leaderboard</span>
      </nav>

      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Leaderboard</h1>
        <p className="text-[var(--color-text-muted)]">
          Top learners ranked by total XP earned across all courses and quizzes.
        </p>
      </div>

      <LearnLeaderboard entries={entries} />

      {/* Back link */}
      <div className="mt-8">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Learn
        </Link>
      </div>
    </div>
  )
}
