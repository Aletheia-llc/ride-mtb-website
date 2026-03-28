import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { getPendingClaims } from '@/modules/shops/lib/queries'
import { approveClaim, denyClaim } from '@/modules/shops/actions/adminShops'

export const metadata: Metadata = {
  title: 'Pending Claims | Admin | Ride MTB',
}

export default async function AdminClaimsPage() {
  await requireAdmin()
  const claims = await getPendingClaims()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Pending Claims</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {claims.length} pending review
        </p>
      </div>

      {claims.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No pending claims.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-sm text-[var(--color-text-muted)]">
              <th className="pb-3 pr-4 font-medium">Shop</th>
              <th className="pb-3 pr-4 font-medium">Claimant</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">Submitted</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => {
              const approveAction = approveClaim.bind(null, claim.id)
              const denyAction = denyClaim.bind(null, claim.id)
              return (
                <tr
                  key={claim.id}
                  className="border-b border-[var(--color-border)] text-sm text-[var(--color-text)]"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/shops/${claim.shop.slug}`}
                      className="font-medium hover:underline"
                    >
                      {claim.shop.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{claim.user.name ?? '—'}</td>
                  <td className="py-3 pr-4">{claim.user.email ?? '—'}</td>
                  <td className="py-3 pr-4">
                    {new Date(claim.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <form action={approveAction}>
                        <button type="submit" className="btn btn-primary btn-sm">
                          Approve
                        </button>
                      </form>
                      <form action={denyAction}>
                        <button type="submit" className="btn btn-sm">
                          Deny
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
