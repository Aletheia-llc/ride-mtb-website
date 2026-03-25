interface DifficultyIndicatorProps {
  level: number // 1-5
  label?: string
  className?: string
}

function getDifficultyColor(level: number): string {
  if (level <= 2) return 'bg-green-500'
  if (level === 3) return 'bg-blue-500'
  if (level === 4) return 'bg-orange-500'
  return 'bg-red-500'
}

export function DifficultyIndicator({
  level,
  label,
  className = '',
}: DifficultyIndicatorProps) {
  const filled = Math.min(Math.max(Math.round(level), 0), 5)
  const color = getDifficultyColor(filled)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          {label}
        </span>
      )}
      <div className="flex gap-1" aria-label={`${label ?? 'Difficulty'}: ${filled} of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`inline-block h-2 w-2 rounded-full ${
              i < filled ? color : 'bg-[var(--color-border)]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
