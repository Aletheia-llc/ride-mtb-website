export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Image placeholder */}
      <div className="aspect-[4/3] animate-pulse bg-[var(--color-border)]" />

      {/* Card body */}
      <div className="flex flex-col gap-2 p-3">
        {/* Title */}
        <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-border)]" />

        {/* Condition + location + time */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 animate-pulse rounded-full bg-[var(--color-border)]" />
          <div className="h-3 w-20 animate-pulse rounded bg-[var(--color-border)]" />
          <div className="ml-auto h-3 w-10 animate-pulse rounded bg-[var(--color-border)]" />
        </div>

        {/* Seller info */}
        <div className="flex items-center gap-1.5 border-t border-[var(--color-border)] pt-2">
          <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--color-border)]" />
          <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-border)]" />
        </div>
      </div>
    </div>
  )
}
