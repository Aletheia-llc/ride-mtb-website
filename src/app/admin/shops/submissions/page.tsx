import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { getPendingSubmissions } from '@/modules/shops/lib/queries'

export const metadata: Metadata = {
  title: 'Pending Submissions | Admin | Ride MTB',
}

export default async function AdminSubmissionsPage() {
  await requireAdmin()
  const shops = await getPendingSubmissions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Pending Submissions</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {shops.length} pending review
        </p>
      </div>

      {shops.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No pending submissions.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-sm text-[var(--color-text-muted)]">
              <th className="pb-3 pr-4 font-medium">Shop</th>
              <th className="pb-3 pr-4 font-medium">Type</th>
              <th className="pb-3 pr-4 font-medium">Location</th>
              <th className="pb-3 pr-4 font-medium">Submitted By</th>
              <th className="pb-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr
                key={shop.id}
                className="border-b border-[var(--color-border)] text-sm text-[var(--color-text)]"
              >
                <td className="py-3 pr-4">
                  <Link
                    href={`/admin/shops/submissions/${shop.id}`}
                    className="font-medium hover:underline"
                  >
                    {shop.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 capitalize">
                  {shop.shopType.replace(/_/g, ' ')}
                </td>
                <td className="py-3 pr-4">
                  {shop.city}, {shop.state}
                </td>
                <td className="py-3 pr-4">{shop.submittedBy?.name ?? '—'}</td>
                <td className="py-3">{new Date(shop.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
