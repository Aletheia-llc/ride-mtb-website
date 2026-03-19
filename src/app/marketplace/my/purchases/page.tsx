import { requireAuth } from '@/lib/auth/guards'
import { getMyPurchases } from '@/modules/marketplace/actions/transactions'
import { TransactionCard } from '@/modules/marketplace/components/transaction/TransactionCard'
import type { TransactionWithDetails } from '@/modules/marketplace/types'

export default async function MyPurchasesPage() {
  await requireAuth()
  const raw = await getMyPurchases()

  // Remap seller → otherParty to match TransactionWithDetails shape
  const purchases = raw.map((t) => ({
    ...t,
    otherParty: t.seller,
  })) as unknown as TransactionWithDetails[]

  return (
    <div>
      <h1>My Purchases</h1>
      {purchases.length === 0 ? (
        <p>You have no purchases yet.</p>
      ) : (
        <div>
          {purchases.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} role="buyer" />
          ))}
        </div>
      )}
    </div>
  )
}
