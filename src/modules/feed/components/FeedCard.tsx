// src/modules/feed/components/FeedCard.tsx
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Map, MessageCircle, Calendar, Star, ShoppingCart, Activity, Mountain, Video, Newspaper } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FeedItemType } from '../types'

interface FeedCardProps {
  id: string
  type: FeedItemType
  title: string
  subtitle: string
  url: string
  imageUrl?: string
  tags: string[]
  meta: string
  reason?: string
  onClickCapture?: () => void
}

const TYPE_ICON: Record<FeedItemType, LucideIcon> = {
  course: BookOpen,
  trail: Map,
  forum: MessageCircle,
  event: Calendar,
  review: Star,
  buysell: ShoppingCart,
  ride_log: Activity,
  trail_review: Mountain,
  creator_video: Video,
  article: Newspaper,
}

export function FeedCard({ id, type, title, subtitle, url, imageUrl, tags, meta, reason, onClickCapture }: FeedCardProps) {
  const Icon = TYPE_ICON[type]
  return (
    <article
      className="flex gap-3 p-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors"
      onClick={onClickCapture}
    >
      {imageUrl && (
        <div className="shrink-0 w-16 h-16 rounded overflow-hidden">
          <Image src={imageUrl} alt={title} width={64} height={64} className="object-cover w-full h-full" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          {tags.map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {tag}
            </span>
          ))}
        </div>
        <Link href={url} className="block font-semibold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] leading-tight mb-0.5 truncate">
          {title}
        </Link>
        <p className="text-xs text-[var(--color-text-muted)] truncate">{subtitle}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-[var(--color-text-muted)]">{meta}</span>
        </div>
        {reason && (
          <p className="text-xs italic text-[var(--color-primary)] mt-1">{reason}</p>
        )}
      </div>
    </article>
  )
}
