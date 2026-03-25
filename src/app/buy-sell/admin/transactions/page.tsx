import { requireAdmin } from '@/lib/auth/guards'
import { getAdminTransactions } from '@/modules/marketplace/actions/admin'
import { TransactionManager } from '@/modules/marketplace/components/admin/TransactionManager'
import type { AdminTransactionWithDetails } from '@/modules/marketplace/types'

export const metadata = {
  title: 'Transactions | Marketplace Admin | Ride MTB',
}

export default async function AdminTransactionsPage() {
  await requireAdmin()

  const rawTransactions = await getAdminTransactions()
  const transactions = rawTransactions as unknown as AdminTransactionWithDetails[]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Transactions
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {transactions.length} transaction
          {transactions.length !== 1 ? 's' : ''} total
        </p>
      </div>
      <TransactionManager initialTransactions={transactions} />
    </div>
  )
}
