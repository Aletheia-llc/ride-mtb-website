import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

interface Props {
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
}

export function LinkPreviewCard({ url, title, description, imageUrl }: Props) {
  if (!title && !description) return null

  let hostname = url
  try { hostname = new URL(url).hostname.replace('www.', '') } catch {}

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex overflow-hidden rounded-lg border border-[var(--color-border)] transition-colors hover:border-[var(--color-primary)]/40"
    >
      {imageUrl && (
        <div className="relative h-20 w-28 shrink-0">
          <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 p-3">
        {title && (
          <p className="line-clamp-1 text-sm font-semibold text-[var(--color-text)]">{title}</p>
        )}
        {description && (
          <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">{description}</p>
        )}
        <p className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
          <ExternalLink className="h-3 w-3" />
          {hostname}
        </p>
      </div>
    </a>
  )
}
