// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'

export async function AdminPayoutsPanel() {
  await requireAdmin()
  const payouts = await db.payoutRequest.findMany({
    where: { status: 'pending' },
    include: { creator: { include: { user: { select: { email: true, name: true } } } } },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-[var(--color-text)]">Pending Payouts</h2>
      {payouts.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No pending payout requests.</p>
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div>
                <p className="font-medium text-[var(--color-text)]">{p.creator.displayName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{p.creator.user.email}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Requested {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[var(--color-text)]">
                  ${(p.amountCents / 100).toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Stripe: {p.creator.stripeAccountId ?? 'not connected'}
                </p>
                <p className="mt-2 text-xs text-yellow-600">
                  Trigger payout manually via Stripe Dashboard → Connect → Transfers
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
