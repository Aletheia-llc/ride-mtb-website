import { Skeleton } from '@/ui/components'

export default function SelectorLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
      {/* Header skeleton */}
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Progress bar skeleton */}
      <Skeleton className="h-6 w-full" />

      {/* Step title skeleton */}
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Options skeleton */}
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-24" />
        ))}
      </div>

      {/* Navigation skeleton */}
      <div className="flex justify-between">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  )
}
