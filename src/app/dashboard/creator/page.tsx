import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getCreatorByUserId } from '@/modules/creators/lib/queries'
import { CreatorDashboard } from '@/modules/creators'

export const metadata: Metadata = {
  title: 'Creator Dashboard | Ride MTB',
}

export default async function CreatorDashboardPage() {
  const user = await requireAuth()

  const profile = await getCreatorByUserId(user.id)
  if (!profile) redirect('/creators/onboarding')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Creator Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Welcome back, {profile.user.name || 'Creator'}</p>
      </div>
      <CreatorDashboard
        displayName={profile.displayName}
        status={profile.status}
        stripeConnected={!!profile.stripeAccountId}
      />
    </div>
  )
}
