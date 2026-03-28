import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ShopStatus } from '@/generated/prisma/client'
import { approveShop, rejectShop } from '@/modules/shops/actions/adminShops'

export const metadata: Metadata = {
  title: 'Review Submission | Admin | Ride MTB',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminSubmissionPreviewPage({ params }: Props) {
  await requireAdmin()

  const { id } = await params

  const shop = await db.shop.findUnique({
    where: { id },
    include: { photos: { orderBy: { sortOrder: 'asc' } } },
  })

  if (!shop || shop.status !== ShopStatus.PENDING_REVIEW) {
    notFound()
  }

  async function approveAndRedirect() {
    'use server'
    await approveShop(id)
    redirect('/admin/shops/submissions')
  }

  async function rejectAndRedirect() {
    'use server'
    await rejectShop(id)
    redirect('/admin/shops/submissions')
  }

  const services = Array.isArray(shop.services) ? (shop.services as string[]) : []
  const brands = Array.isArray(shop.brands) ? (shop.brands as string[]) : []

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{shop.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Submission review
          </p>
        </div>
        <div className="flex gap-3">
          <form action={approveAndRedirect}>
            <button type="submit" className="btn btn-primary">
              Approve
            </button>
          </form>
          <form action={rejectAndRedirect}>
            <button type="submit" className="btn">
              Reject
            </button>
          </form>
        </div>
      </div>

      {/* Details */}
      <section className="space-y-4 rounded-lg border border-[var(--color-border)] p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Shop Details</h2>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="font-medium text-[var(--color-text-muted)]">Type</dt>
            <dd className="mt-0.5 capitalize text-[var(--color-text)]">
              {shop.shopType.replace(/_/g, ' ')}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--color-text-muted)]">Location</dt>
            <dd className="mt-0.5 text-[var(--color-text)]">
              {shop.city}, {shop.state} {shop.zipCode ?? ''}
            </dd>
          </div>
          {shop.phone && (
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Phone</dt>
              <dd className="mt-0.5 text-[var(--color-text)]">{shop.phone}</dd>
            </div>
          )}
          {shop.email && (
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Email</dt>
              <dd className="mt-0.5 text-[var(--color-text)]">{shop.email}</dd>
            </div>
          )}
          {shop.websiteUrl && (
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Website</dt>
              <dd className="mt-0.5 text-[var(--color-text)]">
                <a
                  href={shop.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {shop.websiteUrl}
                </a>
              </dd>
            </div>
          )}
          {shop.submittedByUserId && (
            <div>
              <dt className="font-medium text-[var(--color-text-muted)]">Submitted By (User ID)</dt>
              <dd className="mt-0.5 font-mono text-xs text-[var(--color-text)]">
                {shop.submittedByUserId}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-[var(--color-text-muted)]">Submitted</dt>
            <dd className="mt-0.5 text-[var(--color-text)]">
              {new Date(shop.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </section>

      {/* Description */}
      {shop.description && (
        <section className="space-y-2 rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Description</h2>
          <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{shop.description}</p>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section className="space-y-2 rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Services</h2>
          <p className="text-sm text-[var(--color-text)]">{services.join(', ')}</p>
        </section>
      )}

      {/* Brands */}
      {brands.length > 0 && (
        <section className="space-y-2 rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Brands</h2>
          <p className="text-sm text-[var(--color-text)]">{brands.join(', ')}</p>
        </section>
      )}

      {/* Photos */}
      {shop.photos.length > 0 && (
        <section className="space-y-4 rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Photos</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shop.photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt={shop.name}
                className="h-40 w-full rounded-md object-cover"
              />
            ))}
          </div>
        </section>
      )}

      {/* Bottom actions */}
      <div className="flex gap-3 border-t border-[var(--color-border)] pt-6">
        <form action={approveAndRedirect}>
          <button type="submit" className="btn btn-primary">
            Approve
          </button>
        </form>
        <form action={rejectAndRedirect}>
          <button type="submit" className="btn">
            Reject
          </button>
        </form>
      </div>
    </div>
  )
}
