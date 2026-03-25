import type { Metadata } from 'next'
import Link from 'next/link'
import { Wallet, Coins } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { TransactionList } from './TransactionList'

export const metadata: Metadata = {
  title: 'Wallet | Ride MTB',
}

const PAGE_SIZE = 20

export default async function WalletPage() {
  const user = await requireAuth()

  const [userData, transactions, total] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { creditSeed: true, creditPurchased: true, creditEarned: true },
    }),
    db.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
    }),
    db.creditTransaction.count({ where: { userId: user.id } }),
  ])

  const seed = userData?.creditSeed ?? 0
  const purchased = userData?.creditPurchased ?? 0
  const earned = userData?.creditEarned ?? 0
  const totalCredits = seed + purchased + earned

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-[var(--color-primary)]" />
        <h1 className="text-xl font-bold text-[var(--color-text)]">Wallet</h1>
      </div>

      {/* Balance cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Seed', value: seed },
          { label: 'Purchased', value: purchased },
          { label: 'Earned', value: earned },
          { label: 'Total', value: totalCredits, highlight: true },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className={`rounded-xl border p-4 text-center ${
              highlight
                ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] bg-[var(--color-bg)]'
            }`}
          >
            <div className={`text-2xl font-bold tabular-nums ${highlight ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
              {value.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{label}</div>
          </div>
        ))}
      </div>

      {/* How to earn credits */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
          <Coins className="h-4 w-4 text-amber-500" />
          How to earn credits
        </h2>
        <ul className="space-y-1 text-sm text-[var(--color-text-muted)]">
          <li>• Post in the <Link href="/forum" className="text-[var(--color-primary)] hover:underline">Forum</Link> — earn credits for each post</li>
          <li>• Complete <Link href="/learn" className="text-[var(--color-primary)] hover:underline">Learn</Link> modules</li>
          <li>• Receive tips from other members</li>
          <li>• Get your posts upvoted</li>
        </ul>
      </div>

      {/* Transaction history */}
      <TransactionList
        initialTransactions={transactions.map((t) => ({
          ...t,
          createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
        }))}
        initialTotal={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
