import type { Metadata } from 'next'
import { GarageView } from '@/modules/bikes'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { getUserBikes } from '@/modules/bikes/lib/garage-queries'

export const metadata: Metadata = {
  title: 'My Garage | Ride MTB',
  description: 'Manage your mountain bikes and track service history.',
}

export default async function GaragePage() {
  const user = await requireAuth()
  const bikes = await getUserBikes(user.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <GarageView bikes={bikes} />
    </div>
  )
}
