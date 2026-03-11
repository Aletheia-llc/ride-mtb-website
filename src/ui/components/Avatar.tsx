interface AvatarProps {
  src?: string | null
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
}

export function Avatar({ src, alt = 'User', size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    )
  }

  const initials = alt.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] font-medium text-white ${sizeClasses[size]} ${className}`}
      aria-label={alt}
    >
      {initials}
    </div>
  )
}
