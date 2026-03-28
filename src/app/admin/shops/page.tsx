import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ShopStatus } from '@/generated/prisma/client'
import { AssignOwnerForm } from '@/modules/shops/components/admin/AssignOwnerForm'

export const metadata: Metadata = {
  title: 'Shops | Admin | Ride MTB',
}

interface Props {
  searchParams: Promise<{ status?: string }>
}

const STATUS_TABS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Pending Review', value: ShopStatus.PENDING_REVIEW },
  { label: 'Active', value: ShopStatus.ACTIVE },
  { label: 'Claimed', value: ShopStatus.CLAIMED },
  { label: 'Rejected', value: ShopStatus.REJECTED },
  { label: 'Draft', value: ShopStatus.DRAFT },
]

export default async function AdminShopsPage({ searchParams }: Props) {
  await requireAdmin()

  const { status } = await searchParams
  const statusFilter = status && Object.values(ShopStatus).includes(status as ShopStatus)
    ? (status as ShopStatus)
    : null

  const where = statusFilter ? { status: statusFilter } : {}

  const shops = await db.shop.findMany({
    where,
    include: { owner: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Shops</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {shops.length} shops
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {STATUS_TABS.map(({ label, value }) => {
          const isActive = value === statusFilter
          return (
            <Link
              key={value ?? 'all'}
              href={`/admin/shops${value ? `?status=${value}` : ''}`}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Shops table */}
      {shops.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No shops found.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-sm text-[var(--color-text-muted)]">
              <th className="pb-3 pr-4 font-medium">Name</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Owner</th>
              <th className="pb-3 pr-4 font-medium">Location</th>
              <th className="pb-3 font-medium">Created</th>
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
                    href={`/shops/${shop.slug}`}
                    className="font-medium hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {shop.name}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)]">
                    {shop.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                  {shop.owner ? (
                    <span title={shop.owner.email ?? undefined}>
                      {shop.owner.name ?? shop.owner.email}
                    </span>
                  ) : (
                    <span className="italic">Unassigned</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {shop.city}, {shop.state}
                </td>
                <td className="py-3 text-[var(--color-text-muted)]">
                  {new Date(shop.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Assign Owner */}
      <div className="rounded-lg border border-[var(--color-border)] p-6">
        <AssignOwnerForm />
      </div>
    </div>
  )
}
