import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth/guards'
import { RideLogForm, RideLogList } from '@/modules/rides'
import { Card } from '@/ui/components'
// eslint-disable-next-line no-restricted-imports
import { getUserRideLogs } from '@/modules/rides/lib/queries'

export const metadata: Metadata = {
  title: 'Ride Log | Ride MTB',
  description: 'Track your mountain bike rides and build your riding history.',
}

export default async function RidesPage() {
  const user = await requireAuth()
  const { logs, totalCount } = await getUserRideLogs(user.id)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        Ride Log
      </h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Keep track of your rides. Each logged ride earns XP.
      </p>

      {/* Log a ride form */}
      <Card className="mb-8">
        <RideLogForm />
      </Card>

      {/* Ride history */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
          Your Rides
        </h2>
        <RideLogList logs={logs} totalCount={totalCount} />
      </section>
    </div>
  )
}
