interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  className?: string
}

export function ProgressBar({ value, max = 100, label, className = '' }: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100)

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">{label}</span>
          <span className="font-medium text-[var(--color-text)]">{percentage}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}
