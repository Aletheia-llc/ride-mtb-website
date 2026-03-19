'use client'

import Link from 'next/link'
import { CheckCircle, MessageSquare, ShoppingBag } from 'lucide-react'
import type { TransactionWithDetails } from '@/modules/marketplace/types'

interface CheckoutSuccessProps {
  transaction: TransactionWithDetails
}

export function CheckoutSuccess({ transaction }: CheckoutSuccessProps) {
  return (
    <div className="mx-auto max-w-lg text-center">
      {/* Success animation */}
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
            <CheckCircle className="h-10 w-10 text-[var(--color-primary)]" />
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-primary)]/10" />
        </div>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text)]">
        Payment Successful!
      </h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Your order has been placed. The seller has been notified and will ship
        your item within 5 business days.
      </p>

      {/* Transaction details */}
      <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Order Details
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Item</span>
            <span className="ml-4 max-w-[200px] truncate font-medium text-[var(--color-text)]">
              {transaction.listing.title}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Seller</span>
            <span className="text-[var(--color-text)]">
              {transaction.otherParty.name ?? 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Item Price</span>
            <span className="text-[var(--color-text)]">
              ${Number(transaction.salePrice).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Shipping</span>
            <span className="text-[var(--color-text)]">
              {Number(transaction.shippingCost) > 0
                ? `$${Number(transaction.shippingCost).toFixed(2)}`
                : 'Free'}
            </span>
          </div>
          <div className="border-t border-[var(--color-border)] pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--color-text)]">Total Charged</span>
              <span className="text-lg font-bold text-[var(--color-primary)]">
                ${Number(transaction.totalCharged).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/marketplace/my/messages"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <MessageSquare className="h-4 w-4" />
          Message Seller
        </Link>
        <Link
          href="/marketplace/my/purchases"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
        >
          <ShoppingBag className="h-4 w-4" />
          My Purchases
        </Link>
      </div>
    </div>
  )
}
