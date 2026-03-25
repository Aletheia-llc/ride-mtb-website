import { requireAuth } from '@/lib/auth/guards'
import { getMySales } from '@/modules/marketplace/actions/transactions'
import { TransactionCard } from '@/modules/marketplace/components/transaction/TransactionCard'
import type { TransactionWithDetails } from '@/modules/marketplace/types'

export default async function MySalesPage() {
  await requireAuth()
  const raw = await getMySales()

  // Remap buyer → otherParty to match TransactionWithDetails shape
  const sales = raw.map((t) => ({
    ...t,
    otherParty: t.buyer,
  })) as unknown as TransactionWithDetails[]

  return (
    <div>
      <h1>My Sales</h1>
      {sales.length === 0 ? (
        <p>You have no sales yet.</p>
      ) : (
        <div>
          {sales.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} role="seller" />
          ))}
        </div>
      )}
    </div>
  )
}
