import { Skeleton } from '@/ui/components'

export default function ForumLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero skeleton */}
      <div className="mb-12 space-y-4 text-center">
        <Skeleton className="mx-auto h-12 w-12 rounded-full" />
        <Skeleton className="mx-auto h-10 w-80" />
        <Skeleton className="mx-auto h-5 w-96" />
      </div>

      {/* Section heading skeleton */}
      <Skeleton className="mb-6 h-8 w-40" />

      {/* Category cards grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-40" />
        ))}
      </div>
    </div>
  )
}
