export function ListingDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Photo gallery skeleton */}
          <div className="aspect-[4/3] animate-pulse rounded-xl bg-[var(--color-border)]" />

          {/* Thumbnails row */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-16 animate-pulse rounded-lg bg-[var(--color-border)]"
              />
            ))}
          </div>

          {/* Description skeleton */}
          <div className="flex flex-col gap-2">
            <div className="h-5 w-28 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-3 w-full animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-3 w-full animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--color-border)]" />
          </div>

          {/* Specs skeleton */}
          <div className="flex flex-col gap-2">
            <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className="h-7 w-3/4 animate-pulse rounded bg-[var(--color-border)]" />

          {/* Price */}
          <div className="h-9 w-32 animate-pulse rounded bg-[var(--color-border)]" />

          {/* Badges */}
          <div className="flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--color-border)]" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-[var(--color-border)]" />
          </div>

          {/* Location */}
          <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-border)]" />

          {/* View count */}
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-border)]" />

          {/* Fulfillment */}
          <div className="h-14 animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />

          {/* Action buttons */}
          <div className="h-12 animate-pulse rounded-lg bg-[var(--color-border)]" />
          <div className="h-12 animate-pulse rounded-lg bg-[var(--color-border)]" />

          {/* Seller card */}
          <div className="h-24 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </div>
      </div>
    </div>
  )
}
