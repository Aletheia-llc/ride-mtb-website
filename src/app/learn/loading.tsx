import { Skeleton } from '@/ui/components'

export default function LearnLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero skeleton */}
      <div className="mb-12 space-y-4 text-center">
        <Skeleton className="mx-auto h-10 w-96" />
        <Skeleton className="mx-auto h-5 w-80" />
        <div className="flex justify-center gap-4 pt-4">
          <Skeleton className="h-12 w-40 rounded-lg" />
          <Skeleton className="h-12 w-40 rounded-lg" />
        </div>
      </div>

      {/* Feature cards skeleton */}
      <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>

      {/* Course grid skeleton */}
      <div className="mb-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-64" />
          ))}
        </div>
      </div>
    </div>
  )
}
