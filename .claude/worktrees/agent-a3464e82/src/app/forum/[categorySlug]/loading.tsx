import { Skeleton } from '@/ui/components'

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link skeleton */}
      <Skeleton className="mb-4 h-5 w-28" />

      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Feed skeleton */}
      <Skeleton variant="feed" />
    </div>
  )
}
