// ── Forum module shared types ───────────────────────────────
// Aligned with query return shapes from lib/queries.ts

export interface ForumAuthor {
  id: string
  name: string | null
  username: string | null
  image: string | null
  avatarUrl?: string | null
}

export interface ForumCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sortOrder: number
  _count: { threads: number }
  threads: Array<{ title: string; slug: string; createdAt: Date }>
}

export interface ForumThreadSummary {
  id: string
  title: string
  slug: string
  isPinned: boolean
  isLocked: boolean
  viewCount: number
  createdAt: Date
  updatedAt: Date
  posts: Array<{ author: ForumAuthor }>
  _count: { posts: number }
  voteScore: number
}

export interface ForumPost {
  id: string
  threadId: string
  authorId: string
  content: string
  isFirst: boolean
  createdAt: Date
  updatedAt: Date
  author: ForumAuthor
  voteScore: number
}

export interface ForumThread {
  id: string
  title: string
  slug: string
  isPinned: boolean
  isLocked: boolean
  viewCount: number
  createdAt: Date
  updatedAt: Date
  category: { name: string; slug: string }
  posts: ForumPost[]
}

// ── Utility ─────────────────────────────────────────────────

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
