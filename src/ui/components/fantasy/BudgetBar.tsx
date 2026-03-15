import { formatPrice } from '@/modules/fantasy/lib/pricing'

export function BudgetBar({ spent, cap }: { spent: number; cap: number }) {
  const pct = Math.min((spent / cap) * 100, 100)
  const remaining = cap - spent
  const isOver = spent > cap

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className={isOver ? 'text-red-500 font-semibold' : 'text-[var(--color-text-muted)]'}>
          {formatPrice(spent)} spent
        </span>
        <span className={isOver ? 'text-red-500 font-semibold' : 'text-[var(--color-text-muted)]'}>
          {isOver ? `Over by ${formatPrice(-remaining)}` : `${formatPrice(remaining)} left`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
