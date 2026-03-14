import type { Metadata } from 'next'
import { getActiveContests } from '@/modules/merch/actions/contests'
import { ContestCard } from '@/modules/merch/components/ContestCard'

export const metadata: Metadata = {
  title: 'Design Contests | Ride MTB Merch',
  description: 'Submit your design, vote for your favorites, and see it turned into official Ride MTB merch.',
}

export default async function ContestsPage() {
  const contests = await getActiveContests()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Design Contests</h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Submit your design, vote for your favorites, and see it turned into official Ride MTB merch.
      </p>

      {contests.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.map((contest) => (
            <ContestCard key={contest.id} contest={contest} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-[var(--color-text-muted)] text-lg">No active contests right now.</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">Check back soon!</p>
        </div>
      )}
    </div>
  )
}
