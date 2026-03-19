'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Ban,
  Star,
  Users,
} from 'lucide-react'
import type { AdminSellerWithDetails } from '@/modules/marketplace/types'

interface SellerManagerProps {
  initialSellers: AdminSellerWithDetails[]
}

export function SellerManager({ initialSellers }: SellerManagerProps) {
  const [sellers] = useState(initialSellers)

  if (sellers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-16">
        <Users className="h-10 w-10 text-[var(--color-text-muted)]" />
        <p className="text-[var(--color-text-muted)]">No sellers yet</p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        {sellers.length} seller{sellers.length !== 1 ? 's' : ''}
      </p>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Seller</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Email</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)] text-center">
                Sales
              </th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)] text-center">
                Rating
              </th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)] text-center">
                Listings
              </th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Trust</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">Joined</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-muted)] text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller) => (
              <tr
                key={seller.id}
                className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                {/* Name + avatar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {seller.user.image ? (
                      <Image
                        src={seller.user.image}
                        alt={seller.user.name ?? 'Seller'}
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
                        {(seller.user.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-[var(--color-text)]">
                      {seller.user.name ?? 'Unnamed'}
                    </span>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3 text-[var(--color-text-muted)]">
                  {seller.user.email ?? '-'}
                </td>

                {/* Sales */}
                <td className="px-4 py-3 text-center text-[var(--color-text)]">
                  {seller.totalSales}
                </td>

                {/* Rating */}
                <td className="px-4 py-3 text-center">
                  {seller.averageRating !== null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-[var(--color-text)]">
                        {seller.averageRating.toFixed(1)}
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        ({seller.ratingCount})
                      </span>
                    </span>
                  ) : (
                    <span className="text-[var(--color-text-muted)]">-</span>
                  )}
                </td>

                {/* Listings */}
                <td className="px-4 py-3 text-center text-[var(--color-text)]">
                  {seller._count.listings}
                </td>

                {/* Trust level */}
                <td className="px-4 py-3">
                  {seller.isTrusted ? (
                    <span className="inline-flex items-center gap-1 text-[var(--color-primary)]">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-xs font-medium">Trusted</span>
                    </span>
                  ) : seller.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-blue-500">
                      <Shield className="h-4 w-4" />
                      <span className="text-xs font-medium">Verified</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">Standard</span>
                  )}
                </td>

                {/* Joined */}
                <td className="px-4 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                  {new Date(seller.createdAt).toLocaleDateString()}
                </td>

                {/* Actions — trust/suspend actions require additional admin endpoints */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {!seller.isTrusted ? (
                      <button
                        disabled
                        title="Set Trusted (not yet implemented)"
                        className="rounded-lg p-1.5 text-[var(--color-primary)] opacity-40 cursor-not-allowed"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        disabled
                        title="Remove Trust (not yet implemented)"
                        className="rounded-lg p-1.5 text-amber-400 opacity-40 cursor-not-allowed"
                      >
                        <ShieldX className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      disabled
                      title="Suspend Seller (not yet implemented)"
                      className="rounded-lg p-1.5 text-red-500 opacity-40 cursor-not-allowed"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
