interface SkeletonProps {
  variant?: 'text' | 'card' | 'feed' | 'map' | 'detail' | 'avatar'
  className?: string
}

export function Skeleton({ variant = 'text', className = '' }: SkeletonProps) {
  const baseClass = 'animate-pulse rounded bg-[var(--color-border)]'

  switch (variant) {
    case 'avatar':
      return <div className={`${baseClass} h-10 w-10 rounded-full ${className}`} />
    case 'card':
      return <div className={`${baseClass} h-48 w-full rounded-xl ${className}`} />
    case 'feed':
      return (
        <div className={`space-y-4 ${className}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${baseClass} h-24 w-full rounded-xl`} />
          ))}
        </div>
      )
    case 'map':
      return <div className={`${baseClass} h-96 w-full rounded-xl ${className}`} />
    case 'detail':
      return (
        <div className={`space-y-3 ${className}`}>
          <div className={`${baseClass} h-8 w-3/4`} />
          <div className={`${baseClass} h-4 w-full`} />
          <div className={`${baseClass} h-4 w-5/6`} />
          <div className={`${baseClass} h-4 w-2/3`} />
        </div>
      )
    default:
      return <div className={`${baseClass} h-4 w-full ${className}`} />
  }
}
