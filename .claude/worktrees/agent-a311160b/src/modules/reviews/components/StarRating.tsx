import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
  className?: string
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export function StarRating({
  rating,
  size = 'md',
  interactive = false,
  onChange,
  className = '',
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]
  const iconClass = sizeClasses[size]

  if (interactive && onChange) {
    return (
      <div className={`inline-flex items-center gap-0.5 ${className}`} role="radiogroup" aria-label="Rating">
        {stars.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value !== 1 ? 's' : ''}`}
            onClick={() => onChange(value)}
            className="rounded p-0.5 transition-colors hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <Star
              className={`${iconClass} ${
                value <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-none text-[var(--color-text-muted)]'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5 stars`}>
      {stars.map((value) => (
        <Star
          key={value}
          className={`${iconClass} ${
            value <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-none text-[var(--color-text-muted)]'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
