import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getCreatorByUserId, getCreatorVideos } from '@/modules/creators/lib/queries'
import { getWalletBalance, getWalletTransactions, hasPendingPayout } from '@/modules/creators/lib/wallet'
import { CreatorDashboard } from '@/modules/creators'

export default async function CreatorDashboardPage() {
  const user = await requireAuth()
  const creator = await getCreatorByUserId(user.id)
  if (!creator) redirect('/creators/onboarding')

  const [videos, balanceCents, transactions, pendingPayout] = await Promise.all([
    getCreatorVideos(creator.id),
    getWalletBalance(creator.id),
    getWalletTransactions(creator.id),
    hasPendingPayout(creator.id),
  ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Creator Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{creator.displayName}</p>
      </div>
      <CreatorDashboard
        displayName={creator.displayName}
        status={creator.status}
        stripeConnected={!!creator.stripeAccountId}
        videos={videos}
        balanceCents={balanceCents}
        transactions={transactions}
        hasPendingPayout={pendingPayout}
      />
    </main>
  )
}
