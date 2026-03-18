// ── Forum module shared types ───────────────────────────────────────────────

export interface ForumAuthor {
  id: string
  name: string | null
  username: string | null
  image: string | null
  avatarUrl?: string | null
  role?: string
  karma?: number | null
  isPremium?: boolean
  isVerifiedCreator?: boolean
  userBadges?: BadgeDisplay[]
  // Extended fields present on PostDetail + CommentCard author blocks
  bio?: string | null
  createdAt?: Date
  _count?: { posts: number }
}

export interface BadgeDisplay {
  badge: {
    name: string
    description: string
    icon: string
    color: string
  }
}

export interface ForumCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  sortOrder: number
  _count: { posts: number }
}

export interface PostSummary {
  id: string
  title: string
  slug: string
  body: string
  isPinned: boolean
  isLocked: boolean
  voteScore: number
  commentCount: number
  viewCount: number
  createdAt: Date
  updatedAt: Date
  linkPreviewUrl: string | null
  author: ForumAuthor
  category: { id: string; name: string; slug: string; color: string; icon: string | null }
  tags: Array<{ tag: { id: string; name: string; slug: string; color: string } }>
  _count: { comments: number }
}

export interface PostDetail extends PostSummary {
  linkPreview: LinkPreviewData | null
}

export interface ForumComment {
  id: string
  body: string
  postId: string
  authorId: string
  parentId: string | null
  voteScore: number
  editedAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
  author: ForumAuthor
  replies?: ForumComment[]
}

export interface LinkPreviewData {
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
  fetchedAt: Date
}

// ── Utility ─────────────────────────────────────────────────────────────────

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(months / 12)
  return `${years}y ago`
}
