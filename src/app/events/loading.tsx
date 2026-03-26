import { Skeleton } from '@/ui/components'

export default function EventsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-9 w-32" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Type filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Event list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5"
          >
            <div className="flex gap-4">
              <div className="shrink-0 text-center">
                <Skeleton className="mx-auto mb-1 h-7 w-10" />
                <Skeleton className="mx-auto h-4 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-2 h-5 w-3/4" />
                <Skeleton className="mb-3 h-4 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
