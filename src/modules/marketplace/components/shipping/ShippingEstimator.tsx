'use client'

import { useState, useTransition } from 'react'
import { Truck, Loader2, AlertCircle } from 'lucide-react'
import { estimateShipping } from '@/modules/marketplace/actions/shipping'
import type { ShippingRate } from '@/modules/marketplace/types'

type ShippingEstimatorProps = {
  listingId: string
  flatShippingCost?: number | null
}

function formatDays(days: number): string {
  if (days === 1) return '1 business day'
  return `${days} business days`
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const CARRIER_COLORS: Record<string, string> = {
  USPS: 'text-blue-500',
  UPS: 'text-amber-500',
  FedEx: 'text-purple-500',
  Seller: 'text-green-600',
}

export function ShippingEstimator({
  listingId,
  flatShippingCost,
}: ShippingEstimatorProps) {
  const [zipCode, setZipCode] = useState('')
  const [rates, setRates] = useState<ShippingRate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleGetEstimates() {
    if (!/^\d{5}$/.test(zipCode)) {
      setError('Please enter a valid 5-digit ZIP code')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await estimateShipping(listingId, zipCode)
        setRates(result)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to get shipping estimates',
        )
        setRates(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-[var(--color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Estimate Shipping</h3>
      </div>

      {/* Flat shipping cost callout */}
      {flatShippingCost != null && flatShippingCost > 0 && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
          <span className="text-sm text-[var(--color-text-muted)]">
            Seller offers flat rate shipping:{' '}
            <span className="font-semibold text-green-600">
              {formatPrice(flatShippingCost)}
            </span>
          </span>
        </div>
      )}

      {/* ZIP input + button */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Your ZIP code"
          maxLength={5}
          inputMode="numeric"
          value={zipCode}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 5)
            setZipCode(digits)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleGetEstimates()
            }
          }}
          className="w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
        />
        <button
          type="button"
          onClick={handleGetEstimates}
          disabled={isPending || zipCode.length !== 5}
          className="rounded-lg bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Get Estimates'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rate table */}
      {rates && rates.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">
                  Carrier
                </th>
                <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">
                  Service
                </th>
                <th className="px-3 py-2 text-right font-medium text-[var(--color-text-muted)]">
                  Est. Delivery
                </th>
                <th className="px-3 py-2 text-right font-medium text-[var(--color-text-muted)]">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr
                  key={rate.id}
                  className="border-b border-[var(--color-border)] last:border-b-0"
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={`font-semibold ${CARRIER_COLORS[rate.carrier] ?? 'text-[var(--color-text)]'}`}
                    >
                      {rate.carrier}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-text)]">{rate.service}</td>
                  <td className="px-3 py-2.5 text-right text-[var(--color-text-muted)]">
                    {formatDays(rate.estimatedDays)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[var(--color-text)]">
                    {formatPrice(rate.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
