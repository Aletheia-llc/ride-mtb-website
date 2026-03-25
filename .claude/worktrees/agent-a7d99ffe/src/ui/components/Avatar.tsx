import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizePx = { sm: 32, md: 40, lg: 56 }

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
}

export function Avatar({ src, alt = 'User', size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={sizePx[size]}
        height={sizePx[size]}
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
