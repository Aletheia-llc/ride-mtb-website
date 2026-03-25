import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { AdminListingTable } from '@/modules/marketplace/components/admin/AdminListingTable'
import type { AdminListingWithDetails } from '@/modules/marketplace/types'
import type { Prisma } from '@/generated/prisma/client'

export const metadata = {
  title: 'All Listings | Marketplace Admin | Ride MTB',
}

interface AdminListingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminListingsPage({
  searchParams,
}: AdminListingsPageProps) {
  await requireAdmin()

  const sp = await searchParams
  const statusFilter = typeof sp.status === 'string' ? sp.status : 'all'
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10)) : 1
  const pageSize = 25

  const where: Prisma.ListingWhereInput =
    statusFilter !== 'all'
      ? { status: statusFilter as Prisma.EnumListingStatusFilter }
      : {}

  const [rawListings, total] = await Promise.all([
    db.listing.findMany({
      where,
      include: {
        photos: true,
        seller: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { reports: true, offers: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.listing.count({ where }),
  ])

  const listings = rawListings as AdminListingWithDetails[]
  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          All Listings
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {total} listing{total !== 1 ? 's' : ''} total
        </p>
      </div>
      <AdminListingTable
        initialListings={listings}
        initialTotal={total}
        initialPages={pages}
        initialStatus={statusFilter}
        initialPage={page}
      />
    </div>
  )
}
