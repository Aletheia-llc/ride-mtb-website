interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold' | 'silver' | 'bronze'
  className?: string
}

const badgeVariants = {
  default: 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  gold: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  silver: 'bg-gray-400/15 text-gray-600 dark:text-gray-400',
  bronze: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  )
}
