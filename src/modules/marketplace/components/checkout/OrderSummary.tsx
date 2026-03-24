interface OrderSummaryProps {
  salePrice: number
  shippingCost: number
  totalCharged: number
}

export function OrderSummary({
  salePrice,
  shippingCost,
  totalCharged,
}: OrderSummaryProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        Order Summary
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">Item price</span>
          <span className="text-[var(--color-text)]">${salePrice.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">Shipping</span>
          <span className="text-[var(--color-text)]">
            {shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : 'Free'}
          </span>
        </div>

        <div className="border-t border-[var(--color-border)] pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text)]">Total</span>
            <span className="text-lg font-bold text-[var(--color-text)]">
              ${totalCharged.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--color-dim)]">
        Processing fee included in item price
      </p>
    </div>
  )
}
