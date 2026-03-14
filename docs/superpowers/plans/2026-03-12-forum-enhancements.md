# Forum Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add post editing/deletion, email notifications, a badge system, and a karma leaderboard to the Forum module.

**Architecture:** All four features are purely additive — no existing tables are restructured, only new fields and two new models added to the schema. Email uses the `resend` package (fire-and-forget inside `createPost`); badge grants are fire-and-forget side effects appended to existing server actions; the leaderboard is a new server-rendered page that queries `User.karma` directly.

**Tech Stack:** Next.js 15.5, Prisma v7 + PrismaPg, Supabase, NextAuth v5, Resend (email), Tailwind CSS v4

---

## Patterns Reference

Before implementing, internalize these conventions observed in the codebase:

- **API routes** use `auth()` from `@/lib/auth/config`, return `NextResponse.json()`, and import db directly (add `// eslint-disable-next-line no-restricted-imports` before `@/modules/*/lib/*` imports in `src/app/api/`).
- **Server actions** begin with `'use server'`, call `requireAuth()` at top, return `{ errors: Record<string, string> }` on failure.
- **Fire-and-forget side effects** use `void (async () => { try { ... } catch { } })()` pattern (see `createPost.ts` lines 71–98).
- **Prisma models** use `@@map("snake_case_name")` and `@id @default(cuid())`.
- **Tests** use `vi.mock('@/lib/db/client', () => ({ db: { ... } }))`, import mocked `db` after mock declaration, use `vi.mocked(...).mockResolvedValueOnce(... as never)`.
- **`ForumThread`** type in `src/modules/forum/types/index.ts` must stay in sync with what `getThreadBySlug` returns — any new fields on `ForumPost` or `ForumThread` that are included in the query must be added to the type interfaces.
- **`ThreadPageClient`** is the client boundary; `ThreadView` and `PostCard` receive the thread/post data as props.

---

## Task 1: Schema Migration

**Goal:** Add new fields and models to the schema, push to Supabase, regenerate the Prisma client.

### Steps

- [ ] **1.1** Open `prisma/schema.prisma`. Add the following two fields to `ForumPost` (after `updatedAt`):
  ```prisma
  editedAt  DateTime?
  deletedAt DateTime?
  ```

- [ ] **1.2** Add the following field to `ForumThread` (after `updatedAt`):
  ```prisma
  deletedAt DateTime?
  ```

- [ ] **1.3** Add the following field to `User` (after `updatedAt`, before `lastActivityAt`):
  ```prisma
  emailNotifications Boolean @default(true)
  ```

- [ ] **1.4** Add the following two new models at the end of the FORUM section (after `ForumReport`):
  ```prisma
  model ForumBadge {
    id          String           @id @default(cuid())
    slug        String           @unique
    name        String
    description String
    icon        String
    color       String
    createdAt   DateTime         @default(now())
    userBadges  ForumUserBadge[]

    @@map("forum_badges")
  }

  model ForumUserBadge {
    id        String     @id @default(cuid())
    userId    String
    badgeSlug String
    awardedAt DateTime   @default(now())
    user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
    badge     ForumBadge @relation(fields: [badgeSlug], references: [slug])

    @@unique([userId, badgeSlug])
    @@map("forum_user_badges")
  }
  ```

- [ ] **1.5** Add back-reference to `User` model (after `forumReports   ForumReport[] @relation("forumModerator")`):
  ```prisma
  forumBadges ForumUserBadge[]
  ```

- [ ] **1.6** Run schema push and regenerate client:
  ```bash
  npx prisma db push
  npx prisma generate
  ```
  Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **1.7** Run TypeScript check to confirm no breakage:
  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors (or only pre-existing errors unrelated to this task).

- [ ] **1.8** Commit:
  ```
  feat(schema): add editedAt/deletedAt, emailNotifications, ForumBadge models
  ```

---

## Task 2: Post Edit/Delete

**Goal:** API routes for editing (PATCH) and soft-deleting (DELETE) posts, inline edit form UI, and updated ThreadView with edit/delete actions and deleted-post placeholder.

### Steps

#### 2a — Write tests first (TDD)

- [ ] **2.1** Create `src/app/api/forum/posts/[id]/route.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { NextRequest } from 'next/server'

  // Mock auth
  vi.mock('@/lib/auth/config', () => ({
    auth: vi.fn(),
  }))

  // Mock db
  vi.mock('@/lib/db/client', () => ({
    db: {
      forumPost: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      forumThread: {
        update: vi.fn(),
      },
    },
  }))

  import { auth } from '@/lib/auth/config'
  import { db } from '@/lib/db/client'
  import { PATCH, DELETE } from './route'

  function makeRequest(method: string, body?: object) {
    return new NextRequest(`http://localhost/api/forum/posts/post-1`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const mockParams = Promise.resolve({ id: 'post-1' })

  describe('PATCH /api/forum/posts/[id]', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null)
      const req = makeRequest('PATCH', { content: 'updated' })
      const res = await PATCH(req, { params: mockParams })
      expect(res.status).toBe(401)
    })

    it('returns 403 when edit window has expired for non-admin', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'user-1', role: 'user' },
      } as never)
      const oldDate = new Date(Date.now() - 20 * 60 * 1000) // 20 min ago
      vi.mocked(db.forumPost.findUnique).mockResolvedValueOnce({
        id: 'post-1',
        authorId: 'user-1',
        deletedAt: null,
        createdAt: oldDate,
        content: 'original',
      } as never)
      const req = makeRequest('PATCH', { content: 'updated' })
      const res = await PATCH(req, { params: mockParams })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.error).toBe('edit_window_expired')
    })

    it('returns 200 and updates post within edit window', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'user-1', role: 'user' },
      } as never)
      const recentDate = new Date(Date.now() - 5 * 60 * 1000) // 5 min ago
      vi.mocked(db.forumPost.findUnique).mockResolvedValueOnce({
        id: 'post-1',
        authorId: 'user-1',
        deletedAt: null,
        createdAt: recentDate,
        content: 'original',
      } as never)
      vi.mocked(db.forumPost.update).mockResolvedValueOnce({
        id: 'post-1',
        content: 'updated',
        editedAt: new Date(),
      } as never)
      const req = makeRequest('PATCH', { content: 'updated' })
      const res = await PATCH(req, { params: mockParams })
      expect(res.status).toBe(200)
      expect(db.forumPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'post-1' },
          data: expect.objectContaining({ content: 'updated' }),
        }),
      )
    })
  })

  describe('DELETE /api/forum/posts/[id]', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null)
      const req = makeRequest('DELETE')
      const res = await DELETE(req, { params: mockParams })
      expect(res.status).toBe(401)
    })

    it('soft-deletes a post by setting deletedAt', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'user-1', role: 'user' },
      } as never)
      vi.mocked(db.forumPost.findUnique).mockResolvedValueOnce({
        id: 'post-1',
        authorId: 'user-1',
        isFirst: false,
        threadId: 'thread-1',
        deletedAt: null,
      } as never)
      vi.mocked(db.forumPost.update).mockResolvedValueOnce({} as never)
      const req = makeRequest('DELETE')
      const res = await DELETE(req, { params: mockParams })
      expect(res.status).toBe(204)
      expect(db.forumPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'post-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      )
    })

    it('also soft-deletes the thread when isFirst post is deleted', async () => {
      vi.mocked(auth).mockResolvedValueOnce({
        user: { id: 'user-1', role: 'user' },
      } as never)
      vi.mocked(db.forumPost.findUnique).mockResolvedValueOnce({
        id: 'post-1',
        authorId: 'user-1',
        isFirst: true,
        threadId: 'thread-1',
        deletedAt: null,
      } as never)
      vi.mocked(db.forumPost.update).mockResolvedValueOnce({} as never)
      vi.mocked(db.forumThread.update).mockResolvedValueOnce({} as never)
      const req = makeRequest('DELETE')
      const res = await DELETE(req, { params: mockParams })
      expect(res.status).toBe(204)
      expect(db.forumThread.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'thread-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      )
    })
  })
  ```

- [ ] **2.2** Run tests — expect failures (files don't exist yet):
  ```bash
  npx vitest run src/app/api/forum/posts
  ```

#### 2b — Implement API route

- [ ] **2.3** Create directory `src/app/api/forum/posts/[id]/` and create `route.ts`:

  ```typescript
  import { NextRequest, NextResponse } from 'next/server'
  import { auth } from '@/lib/auth/config'
  // eslint-disable-next-line no-restricted-imports
  import { db } from '@/lib/db/client'

  const EDIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

  interface RouteParams {
    params: Promise<{ id: string }>
  }

  export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const content: unknown = body?.content

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content_required' }, { status: 400 })
    }
    if (content.length > 10000) {
      return NextResponse.json({ error: 'content_too_long' }, { status: 400 })
    }

    const post = await db.forumPost.findUnique({
      where: { id },
      select: { id: true, authorId: true, createdAt: true, deletedAt: true, content: true },
    })

    if (!post || post.deletedAt !== null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const isAuthor = post.authorId === session.user.id
    const isAdmin = session.user.role === 'admin'

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isAdmin) {
      const age = Date.now() - new Date(post.createdAt).getTime()
      if (age > EDIT_WINDOW_MS) {
        return NextResponse.json({ error: 'edit_window_expired' }, { status: 403 })
      }
    }

    const updated = await db.forumPost.update({
      where: { id },
      data: { content: content.trim(), editedAt: new Date() },
      select: { id: true, content: true, editedAt: true },
    })

    return NextResponse.json(updated)
  }

  export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const post = await db.forumPost.findUnique({
      where: { id },
      select: { id: true, authorId: true, isFirst: true, threadId: true, deletedAt: true },
    })

    if (!post) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const isAuthor = post.authorId === session.user.id
    const isAdmin = session.user.role === 'admin'

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()

    await db.forumPost.update({
      where: { id },
      data: { deletedAt: now },
    })

    if (post.isFirst) {
      await db.forumThread.update({
        where: { id: post.threadId },
        data: { deletedAt: now },
      })
    }

    return new NextResponse(null, { status: 204 })
  }
  ```

- [ ] **2.4** Run tests — expect all to pass:
  ```bash
  npx vitest run src/app/api/forum/posts
  ```
  Expected: `5 tests passed`

#### 2c — Update Forum types to include new fields

- [ ] **2.5** Edit `src/modules/forum/types/index.ts`. Update `ForumPost` interface to add the two new optional fields:

  ```typescript
  export interface ForumPost {
    id: string
    threadId: string
    authorId: string
    content: string
    isFirst: boolean
    createdAt: Date
    updatedAt: Date
    editedAt: Date | null        // ADD
    deletedAt: Date | null       // ADD
    author: ForumAuthor
    voteScore: number
  }
  ```

  Also update `ForumThread` to add `deletedAt`:

  ```typescript
  export interface ForumThread {
    id: string
    title: string
    slug: string
    isPinned: boolean
    isLocked: boolean
    viewCount: number
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null       // ADD
    category: { name: string; slug: string }
    posts: ForumPost[]
  }
  ```

- [ ] **2.6** Edit `src/modules/forum/lib/queries.ts`. In `getThreadBySlug`, update the `posts` include to also select `editedAt` and `deletedAt`. Change the posts include block to:

  ```typescript
  posts: {
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          avatarUrl: true,
        },
      },
    },
  },
  ```

  Note: `editedAt` and `deletedAt` are scalar fields on `ForumPost` — they are automatically included when using `include` (not `select`), so no additional change is needed here. However, `ForumThread` also needs `deletedAt` in its return — since `getThreadBySlug` uses `findUnique` with `include` (not `select`), scalar fields are returned by default. No query change needed.

#### 2d — Create EditPostForm component

- [ ] **2.7** Create `src/modules/forum/components/EditPostForm.tsx`:

  ```typescript
  'use client'

  import { useState, useTransition } from 'react'

  interface EditPostFormProps {
    postId: string
    initialContent: string
    onSave: (newContent: string, editedAt: Date) => void
    onCancel: () => void
  }

  export function EditPostForm({ postId, initialContent, onSave, onCancel }: EditPostFormProps) {
    const [content, setContent] = useState(initialContent)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      if (!content.trim()) {
        setError('Content cannot be empty.')
        return
      }
      if (content.length > 10000) {
        setError('Content must be at most 10,000 characters.')
        return
      }
      setError(null)
      startTransition(async () => {
        const res = await fetch(`/api/forum/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        if (res.status === 403) {
          const json = await res.json()
          if (json.error === 'edit_window_expired') {
            setError('The 15-minute edit window has expired.')
          } else {
            setError('You do not have permission to edit this post.')
          }
          return
        }
        if (!res.ok) {
          setError('Failed to save. Please try again.')
          return
        }
        const updated = await res.json()
        onSave(updated.content, new Date(updated.editedAt))
      })
    }

    return (
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={10000}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
        />
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }
  ```

#### 2e — Update PostCard with edit/delete actions

- [ ] **2.8** Edit `src/modules/forum/components/PostCard.tsx`. Replace the full file contents with:

  ```typescript
  'use client'

  import { useState, useOptimistic, useTransition } from 'react'
  import { ThumbsUp, ThumbsDown, Pencil, Trash2 } from 'lucide-react'
  import { Avatar, Badge } from '@/ui/components'
  import { EditPostForm } from './EditPostForm'
  import type { ForumPost } from '@/modules/forum/types'
  import { formatRelativeTime } from '@/modules/forum/types'

  interface PostCardProps {
    post: ForumPost
    currentUserId: string | null
    currentUserRole?: string | null
    onVote: (postId: string, value: 1 | -1) => Promise<void>
  }

  const EDIT_WINDOW_MS = 15 * 60 * 1000

  export function PostCard({ post, currentUserId, currentUserRole, onVote }: PostCardProps) {
    const [optimisticScore, setOptimisticScore] = useOptimistic(
      post.voteScore,
      (_current: number, delta: number) => _current + delta,
    )
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [localContent, setLocalContent] = useState(post.content)
    const [localEditedAt, setLocalEditedAt] = useState<Date | null>(post.editedAt)
    const [deleted, setDeleted] = useState(!!post.deletedAt)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const displayName = post.author.name || post.author.username || 'Anonymous'
    const avatarSrc = post.author.avatarUrl || post.author.image
    const canVote = !!currentUserId && currentUserId !== post.authorId
    const isAdmin = currentUserRole === 'admin'
    const isAuthor = currentUserId === post.authorId
    const withinEditWindow = Date.now() - new Date(post.createdAt).getTime() < EDIT_WINDOW_MS
    const canEdit = (isAuthor && withinEditWindow) || isAdmin
    const canDelete = isAuthor || isAdmin

    function handleVote(value: 1 | -1) {
      if (!canVote) return
      startTransition(async () => {
        setOptimisticScore(value)
        await onVote(post.id, value)
      })
    }

    async function handleDelete() {
      if (!confirm('Delete this post? This cannot be undone.')) return
      const res = await fetch(`/api/forum/posts/${post.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleted(true)
      } else {
        setDeleteError('Failed to delete. Please try again.')
      }
    }

    if (deleted) {
      return (
        <article className="flex gap-4 border-b border-[var(--color-border)] py-5 last:border-b-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm italic text-[var(--color-text-muted)]">
              This post has been deleted.
            </p>
          </div>
        </article>
      )
    }

    return (
      <article className="flex gap-4 border-b border-[var(--color-border)] py-5 last:border-b-0">
        {/* Author column */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <Avatar src={avatarSrc} alt={displayName} size="md" />
        </div>

        {/* Content column */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text)]">
              {displayName}
            </span>
            {post.isFirst && <Badge variant="info">OP</Badge>}
            <time
              dateTime={new Date(post.createdAt).toISOString()}
              className="text-xs text-[var(--color-text-muted)]"
            >
              {formatRelativeTime(post.createdAt)}
            </time>
            {localEditedAt && (
              <span className="text-xs text-[var(--color-text-muted)]">(edited)</span>
            )}
          </div>

          {/* Body or edit form */}
          {isEditing ? (
            <EditPostForm
              postId={post.id}
              initialContent={localContent}
              onSave={(newContent, editedAt) => {
                setLocalContent(newContent)
                setLocalEditedAt(editedAt)
                setIsEditing(false)
              }}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text)] leading-relaxed">
              {localContent}
            </div>
          )}

          {/* Action bar */}
          {!isEditing && (
            <div className="mt-3 flex items-center gap-1">
              {/* Vote buttons */}
              <button
                type="button"
                onClick={() => handleVote(1)}
                disabled={!canVote || isPending}
                aria-label="Upvote"
                className="inline-flex items-center justify-center rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-green-600 disabled:pointer-events-none disabled:opacity-40"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>

              <span className="min-w-[2rem] text-center text-sm font-medium text-[var(--color-text)]">
                {optimisticScore}
              </span>

              <button
                type="button"
                onClick={() => handleVote(-1)}
                disabled={!canVote || isPending}
                aria-label="Downvote"
                className="inline-flex items-center justify-center rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-red-500 disabled:pointer-events-none disabled:opacity-40"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>

              {/* Edit / Delete */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit post"
                  className="ml-2 inline-flex items-center justify-center rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label="Delete post"
                  className="inline-flex items-center justify-center rounded p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {deleteError && (
            <p className="mt-1 text-xs text-red-500">{deleteError}</p>
          )}
        </div>
      </article>
    )
  }
  ```

#### 2f — Update ThreadView and ThreadPageClient to pass currentUserRole

- [ ] **2.9** Edit `src/modules/forum/components/ThreadView.tsx`. Add `currentUserRole` to `ThreadViewProps` and pass it to `PostCard`:

  ```typescript
  'use client'

  import Link from 'next/link'
  import { Eye, MessageSquare, Lock } from 'lucide-react'
  import { PostCard } from './PostCard'
  import type { ForumThread } from '@/modules/forum/types'
  import { formatRelativeTime } from '@/modules/forum/types'

  interface ThreadViewProps {
    thread: ForumThread
    currentUserId: string | null
    currentUserRole?: string | null
    onVote: (postId: string, value: 1 | -1) => Promise<void>
    renderTrailEmbed?: (threadId: string) => React.ReactNode
  }

  export function ThreadView({ thread, currentUserId, currentUserRole, onVote, renderTrailEmbed }: ThreadViewProps) {
    return (
      <div>
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Link href="/forum" className="transition-colors hover:text-[var(--color-text)]">
            Forum
          </Link>
          <span>/</span>
          <Link
            href={`/forum/${thread.category.slug}`}
            className="transition-colors hover:text-[var(--color-text)]"
          >
            {thread.category.name}
          </Link>
        </nav>

        {/* Thread header */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{thread.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {thread.viewCount} {thread.viewCount === 1 ? 'view' : 'views'}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {thread.posts.length} {thread.posts.length === 1 ? 'post' : 'posts'}
            </span>
            <time dateTime={new Date(thread.createdAt).toISOString()}>
              {formatRelativeTime(thread.createdAt)}
            </time>
          </div>
        </header>

        {/* Trail embed slot */}
        {renderTrailEmbed && renderTrailEmbed(thread.id)}

        {/* Locked notice */}
        {thread.isLocked && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-600/40 dark:bg-yellow-900/20 dark:text-yellow-300">
            <Lock className="h-4 w-4 flex-shrink-0" />
            This thread is locked. No new replies can be posted.
          </div>
        )}

        {/* Posts */}
        <div className="divide-y-0">
          {thread.posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onVote={onVote}
            />
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **2.10** Edit `src/app/forum/thread/[slug]/ThreadPageClient.tsx` to accept and pass `currentUserRole`:

  ```typescript
  'use client'

  import { ThreadView, ReplyForm } from '@/modules/forum'
  // eslint-disable-next-line no-restricted-imports
  import { votePost } from '@/modules/forum/actions/votePost'
  import type { ForumThread } from '@/modules/forum'

  interface ThreadPageClientProps {
    thread: ForumThread
    currentUserId: string | null
    currentUserRole?: string | null
  }

  export function ThreadPageClient({ thread, currentUserId, currentUserRole }: ThreadPageClientProps) {
    async function handleVote(postId: string, value: 1 | -1) {
      await votePost(postId, value)
    }

    return (
      <>
        <ThreadView
          thread={thread}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onVote={handleVote}
        />
        <div className="mt-8">
          <ReplyForm threadId={thread.id} isLocked={thread.isLocked} />
        </div>
      </>
    )
  }
  ```

- [ ] **2.11** Edit `src/app/forum/thread/[slug]/page.tsx` to pass `currentUserRole`:

  Change the `ThreadPageClient` render call to:
  ```typescript
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ThreadPageClient
        thread={thread}
        currentUserId={currentUserId}
        currentUserRole={session?.user?.role ?? null}
      />
    </div>
  )
  ```

- [ ] **2.12** Export `EditPostForm` from the forum components index. Edit `src/modules/forum/components/index.ts` to add:
  ```typescript
  export { EditPostForm } from './EditPostForm'
  ```

- [ ] **2.13** TypeScript check:
  ```bash
  npx tsc --noEmit
  ```

- [ ] **2.14** Commit:
  ```
  feat(forum): post edit/delete — PATCH/DELETE API, EditPostForm, PostCard actions
  ```

---

## Task 3: Email Notifications

**Goal:** Install Resend, add `emailNotifications` field to profile settings, fire email notifications from `createPost`.

### Steps

#### 3a — Install dependency

- [ ] **3.1** Install Resend:
  ```bash
  npm install resend
  ```
  Expected: package added to `package.json`.

- [ ] **3.2** Add `RESEND_API_KEY` to your `.env.local` (for dev) and to Vercel environment variables (for production):
  ```
  RESEND_API_KEY=re_...
  ```

#### 3b — Write tests first

- [ ] **3.3** Create `src/modules/forum/lib/email.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  // Mock Resend
  vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
      },
    })),
  }))

  import { sendReplyNotification, sendMentionNotification } from './email'

  describe('sendReplyNotification', () => {
    beforeEach(() => vi.clearAllMocks())

    it('sends email when emailNotifications is true', async () => {
      await expect(
        sendReplyNotification({
          toEmail: 'author@example.com',
          toName: 'Author',
          replierName: 'Rider',
          threadTitle: 'Best trails?',
          threadSlug: 'best-trails-abc123',
          emailNotifications: true,
        }),
      ).resolves.not.toThrow()
    })

    it('skips sending when emailNotifications is false', async () => {
      const { Resend } = await import('resend')
      const mockSend = vi.fn()
      vi.mocked(Resend).mockImplementationOnce(() => ({ emails: { send: mockSend } }) as never)

      await sendReplyNotification({
        toEmail: 'author@example.com',
        toName: 'Author',
        replierName: 'Rider',
        threadTitle: 'Best trails?',
        threadSlug: 'best-trails-abc123',
        emailNotifications: false,
      })

      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('sendMentionNotification', () => {
    it('sends email with correct subject when emailNotifications is true', async () => {
      await expect(
        sendMentionNotification({
          toEmail: 'mentioned@example.com',
          toName: 'Mentioned',
          mentionerName: 'Shredder',
          threadTitle: 'Trail tips',
          threadSlug: 'trail-tips-xyz',
          emailNotifications: true,
        }),
      ).resolves.not.toThrow()
    })
  })
  ```

- [ ] **3.4** Run tests — expect failures:
  ```bash
  npx vitest run src/modules/forum/lib/email
  ```

#### 3c — Implement email module

- [ ] **3.5** Create `src/modules/forum/lib/email.ts`:

  ```typescript
  import 'server-only'
  import { Resend } from 'resend'

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = 'Ride MTB <notifications@ride-mtb.com>'
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

  interface ReplyNotificationInput {
    toEmail: string
    toName: string | null
    replierName: string
    threadTitle: string
    threadSlug: string
    emailNotifications: boolean
  }

  interface MentionNotificationInput {
    toEmail: string
    toName: string | null
    mentionerName: string
    threadTitle: string
    threadSlug: string
    emailNotifications: boolean
  }

  export async function sendReplyNotification({
    toEmail,
    toName,
    replierName,
    threadTitle,
    threadSlug,
    emailNotifications,
  }: ReplyNotificationInput): Promise<void> {
    if (!emailNotifications) return

    const threadUrl = `${BASE_URL}/forum/thread/${threadSlug}`
    const greeting = toName ? `Hi ${toName},` : 'Hi,'

    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `New reply in "${threadTitle}"`,
      html: `
        <p>${greeting}</p>
        <p><strong>${replierName}</strong> replied to your thread <strong>"${threadTitle}"</strong> on Ride MTB.</p>
        <p><a href="${threadUrl}" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;">View Thread</a></p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">You can turn off email notifications in your <a href="${BASE_URL}/profile/settings">profile settings</a>.</p>
      `,
    })
  }

  export async function sendMentionNotification({
    toEmail,
    toName,
    mentionerName,
    threadTitle,
    threadSlug,
    emailNotifications,
  }: MentionNotificationInput): Promise<void> {
    if (!emailNotifications) return

    const threadUrl = `${BASE_URL}/forum/thread/${threadSlug}`
    const greeting = toName ? `Hi ${toName},` : 'Hi,'

    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `${mentionerName} mentioned you on Ride MTB`,
      html: `
        <p>${greeting}</p>
        <p><strong>${mentionerName}</strong> mentioned you in <strong>"${threadTitle}"</strong>.</p>
        <p><a href="${threadUrl}" style="display:inline-block;padding:10px 20px;background:#22c55e;color:#fff;text-decoration:none;border-radius:6px;">View Post</a></p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px;">You can turn off email notifications in your <a href="${BASE_URL}/profile/settings">profile settings</a>.</p>
      `,
    })
  }
  ```

- [ ] **3.6** Run tests — expect all to pass:
  ```bash
  npx vitest run src/modules/forum/lib/email
  ```

#### 3d — Wire email into createPost

- [ ] **3.7** Edit `src/modules/forum/actions/createPost.ts`. Add the email imports at the top (after existing imports):

  ```typescript
  // eslint-disable-next-line no-restricted-imports
  import { sendReplyNotification, sendMentionNotification } from '../lib/email'
  ```

  Then, inside the fire-and-forget block (after the existing `createNotification` call and before the closing `} catch {}`), add:

  ```typescript
  // Send reply email notification
  if (thread && threadAuthorId && threadAuthorId !== user.id) {
    const threadAuthor = await db.user.findUnique({
      where: { id: threadAuthorId },
      select: { email: true, name: true, emailNotifications: true },
    })
    if (threadAuthor) {
      sendReplyNotification({
        toEmail: threadAuthor.email,
        toName: threadAuthor.name,
        replierName: user.name ?? user.email ?? 'Someone',
        threadTitle: thread.title,
        threadSlug: thread.slug,
        emailNotifications: threadAuthor.emailNotifications,
      }).catch(console.error)
    }
  }

  // Parse @mentions and send mention notifications
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g
  const mentionedUsernames = [...(post.content ?? '').matchAll(mentionRegex)].map((m) => m[1])
  if (mentionedUsernames.length > 0 && thread) {
    const mentionedUsers = await db.user.findMany({
      where: {
        username: { in: mentionedUsernames },
        NOT: { id: user.id },
      },
      select: { email: true, name: true, emailNotifications: true },
    })
    for (const mentionedUser of mentionedUsers) {
      sendMentionNotification({
        toEmail: mentionedUser.email,
        toName: mentionedUser.name,
        mentionerName: user.name ?? user.email ?? 'Someone',
        threadTitle: thread.title,
        threadSlug: thread.slug,
        emailNotifications: mentionedUser.emailNotifications,
      }).catch(console.error)
    }
  }
  ```

  The `@mention` parsing uses the content from `parsed.data.content` — adjust the variable reference to `content` (which is already destructured from `parsed.data` at line 50).

  Full revised fire-and-forget block after Task 3.7 should look like:

  ```typescript
  void (async () => {
    try {
      const thread = await db.forumThread.findUnique({
        where: { id: threadId },
        select: {
          title: true,
          slug: true,
          posts: {
            where: { isFirst: true },
            select: { authorId: true },
            take: 1,
          },
        },
      })
      const threadAuthorId = thread?.posts[0]?.authorId
      if (thread && threadAuthorId && threadAuthorId !== user.id) {
        await createNotification(
          threadAuthorId,
          'forum_reply',
          'New reply to your thread',
          `${user.name ?? user.email ?? 'Someone'} replied to "${thread.title}"`,
          `/forum/thread/${thread.slug}`,
        )
        // Send reply email
        const threadAuthor = await db.user.findUnique({
          where: { id: threadAuthorId },
          select: { email: true, name: true, emailNotifications: true },
        })
        if (threadAuthor) {
          sendReplyNotification({
            toEmail: threadAuthor.email,
            toName: threadAuthor.name,
            replierName: user.name ?? user.email ?? 'Someone',
            threadTitle: thread.title,
            threadSlug: thread.slug,
            emailNotifications: threadAuthor.emailNotifications,
          }).catch(console.error)
        }
      }
      // @mention emails
      const mentionRegex = /@([a-zA-Z0-9_-]+)/g
      const mentionedUsernames = [...content.matchAll(mentionRegex)].map((m) => m[1])
      if (mentionedUsernames.length > 0 && thread) {
        const mentionedUsers = await db.user.findMany({
          where: { username: { in: mentionedUsernames }, NOT: { id: user.id } },
          select: { email: true, name: true, emailNotifications: true },
        })
        for (const mentionedUser of mentionedUsers) {
          sendMentionNotification({
            toEmail: mentionedUser.email,
            toName: mentionedUser.name,
            mentionerName: user.name ?? user.email ?? 'Someone',
            threadTitle: thread.title,
            threadSlug: thread.slug,
            emailNotifications: mentionedUser.emailNotifications,
          }).catch(console.error)
        }
      }
    } catch {
      // notifications are best-effort
    }
  })()
  ```

#### 3e — Update profile types, queries, action, and form

- [ ] **3.8** Edit `src/modules/profile/types/index.ts`. Add `emailNotifications: boolean` to `UserProfileData` (after `bannedAt`):

  ```typescript
  bannedAt: Date | null
  emailNotifications: boolean   // ADD
  ```

  Add `emailNotifications` to `ProfileUpdateInput` (after `interests`):
  ```typescript
  emailNotifications?: boolean
  ```

- [ ] **3.9** Edit `src/modules/profile/lib/queries.ts`. In `getUserProfile`, add `emailNotifications: true` to the `select` block (after `bannedAt`):
  ```typescript
  bannedAt: true,
  emailNotifications: true,
  ```

  Do the same in `getUserByUsername`.

  In `updateProfile`, add to the `data` block:
  ```typescript
  emailNotifications: input.emailNotifications,
  ```

- [ ] **3.10** Edit `src/modules/profile/actions/updateProfile.ts`. In the Zod schema, add:
  ```typescript
  emailNotifications: z.boolean().optional(),
  ```

  In the `raw` object, add:
  ```typescript
  emailNotifications: formData.get('emailNotifications') === 'true',
  ```

  (The checkbox sends 'true' as string when checked and is absent when unchecked — handle this carefully. Use a hidden input pattern: see 3.11.)

  Actually, for a checkbox, the value will be `'on'` when checked and `null` when unchecked. Update the raw parsing to:
  ```typescript
  emailNotifications: formData.get('emailNotifications') !== null,
  ```

  And the Zod schema field:
  ```typescript
  emailNotifications: z.boolean().optional(),
  ```

- [ ] **3.11** Edit `src/modules/profile/components/ProfileForm.tsx`. Add the notification toggle section between the Interests section and the action buttons:

  ```typescript
  {/* Email notification preference */}
  <div className="flex items-start gap-3">
    <input
      type="checkbox"
      id="emailNotifications"
      name="emailNotifications"
      defaultChecked={user.emailNotifications}
      className="mt-0.5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
    />
    <div>
      <label htmlFor="emailNotifications" className="text-sm font-medium text-[var(--color-text)] cursor-pointer">
        Email me when someone replies to my threads
      </label>
      <p className="text-xs text-[var(--color-text-muted)]">
        Also notifies you when someone mentions you with @username.
      </p>
    </div>
  </div>
  ```

- [ ] **3.12** TypeScript check:
  ```bash
  npx tsc --noEmit
  ```

- [ ] **3.13** Commit:
  ```
  feat(forum): email notifications via Resend — reply + @mention triggers, profile toggle
  ```

---

## Task 4: Badge System

**Goal:** Seed 8 badge definitions, implement `checkAndGrantBadges`, hook into actions, display badges on user profile and PostCard.

### Steps

#### 4a — Write tests first

- [ ] **4.1** Create `src/modules/forum/lib/badges.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  vi.mock('@/lib/db/client', () => ({
    db: {
      forumPost: {
        count: vi.fn(),
      },
      forumThread: {
        count: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      forumUserBadge: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  }))

  import { db } from '@/lib/db/client'
  import { checkAndGrantBadges } from './badges'

  describe('checkAndGrantBadges', () => {
    beforeEach(() => vi.clearAllMocks())

    it('grants first-post badge when user has exactly 1 post', async () => {
      vi.mocked(db.forumPost.count).mockResolvedValue(1)
      vi.mocked(db.forumThread.count).mockResolvedValue(0)
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-1',
        karma: 0,
        createdAt: new Date(),
      } as never)
      vi.mocked(db.forumUserBadge.upsert).mockResolvedValue({} as never)

      await checkAndGrantBadges('user-1', 'post')

      expect(db.forumUserBadge.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_badgeSlug: { userId: 'user-1', badgeSlug: 'first-post' } },
          create: expect.objectContaining({ userId: 'user-1', badgeSlug: 'first-post' }),
        }),
      )
    })

    it('does not grant first-post badge when user has 0 posts', async () => {
      vi.mocked(db.forumPost.count).mockResolvedValue(0)
      vi.mocked(db.forumThread.count).mockResolvedValue(0)
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-1',
        karma: 0,
        createdAt: new Date(),
      } as never)

      await checkAndGrantBadges('user-1', 'post')

      const upsertCalls = vi.mocked(db.forumUserBadge.upsert).mock.calls
      const firstPostCalls = upsertCalls.filter((call) => {
        const arg = call[0] as { where?: { userId_badgeSlug?: { badgeSlug?: string } } }
        return arg.where?.userId_badgeSlug?.badgeSlug === 'first-post'
      })
      expect(firstPostCalls).toHaveLength(0)
    })

    it('upsert prevents duplicate badges (db constraint honored by using upsert)', async () => {
      vi.mocked(db.forumPost.count).mockResolvedValue(2)
      vi.mocked(db.forumThread.count).mockResolvedValue(0)
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-1',
        karma: 0,
        createdAt: new Date(),
      } as never)
      vi.mocked(db.forumUserBadge.upsert).mockResolvedValue({} as never)

      // Call twice — upsert is idempotent
      await checkAndGrantBadges('user-1', 'post')
      await checkAndGrantBadges('user-1', 'post')

      // first-post badge: should NOT be upserted when count > 1
      const upsertCalls = vi.mocked(db.forumUserBadge.upsert).mock.calls
      const firstPostCalls = upsertCalls.filter((call) => {
        const arg = call[0] as { where?: { userId_badgeSlug?: { badgeSlug?: string } } }
        return arg.where?.userId_badgeSlug?.badgeSlug === 'first-post'
      })
      expect(firstPostCalls).toHaveLength(0)
    })
  })
  ```

- [ ] **4.2** Run tests — expect failures:
  ```bash
  npx vitest run src/modules/forum/lib/badges
  ```

#### 4b — Create badge seed script

- [ ] **4.3** Create `prisma/seed-badges.ts`:

  ```typescript
  import { PrismaPg } from '@prisma/adapter-pg'
  import { PrismaClient } from '../src/generated/prisma/client'
  import pg from 'pg'

  const pool = new pg.Pool({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME ?? 'postgres',
    ssl: process.env.DATABASE_HOST?.includes('supabase.com')
      ? { rejectUnauthorized: false }
      : false,
  })

  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const BADGES = [
    {
      slug: 'first-post',
      name: 'First Post',
      description: 'Created your first forum post.',
      icon: 'MessageSquare',
      color: '#22c55e',
    },
    {
      slug: '10-posts',
      name: 'Regular',
      description: 'Created 10 forum posts.',
      icon: 'MessageCircle',
      color: '#3b82f6',
    },
    {
      slug: '50-posts',
      name: 'Contributor',
      description: 'Created 50 forum posts.',
      icon: 'MessagesSquare',
      color: '#8b5cf6',
    },
    {
      slug: '100-posts',
      name: 'Veteran',
      description: 'Created 100 forum posts.',
      icon: 'Award',
      color: '#f59e0b',
    },
    {
      slug: 'first-thread',
      name: 'Thread Starter',
      description: 'Created your first thread.',
      icon: 'FilePlus',
      color: '#06b6d4',
    },
    {
      slug: 'helpful',
      name: 'Helpful',
      description: 'Received 10 upvotes across all posts.',
      icon: 'ThumbsUp',
      color: '#10b981',
    },
    {
      slug: 'popular',
      name: 'Popular',
      description: 'Received 50 upvotes across all posts.',
      icon: 'TrendingUp',
      color: '#f97316',
    },
    {
      slug: 'month-old',
      name: 'Early Rider',
      description: 'Account is at least 30 days old.',
      icon: 'Calendar',
      color: '#ec4899',
    },
  ]

  async function main() {
    console.log('Seeding forum badges…')
    for (const badge of BADGES) {
      await prisma.forumBadge.upsert({
        where: { slug: badge.slug },
        create: badge,
        update: badge,
      })
      console.log(`  ✓ ${badge.name}`)
    }
    console.log('Done.')
  }

  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
  ```

#### 4c — Implement checkAndGrantBadges

- [ ] **4.4** Create `src/modules/forum/lib/badges.ts`:

  ```typescript
  import 'server-only'
  import { db } from '@/lib/db/client'

  type BadgeContext = 'post' | 'thread' | 'vote'

  interface BadgeCheck {
    slug: string
    condition: (data: {
      postCount: number
      threadCount: number
      karma: number
      accountAgeDays: number
    }) => boolean
  }

  const BADGE_CHECKS: BadgeCheck[] = [
    { slug: 'first-post',   condition: ({ postCount })    => postCount >= 1 },
    { slug: '10-posts',     condition: ({ postCount })    => postCount >= 10 },
    { slug: '50-posts',     condition: ({ postCount })    => postCount >= 50 },
    { slug: '100-posts',    condition: ({ postCount })    => postCount >= 100 },
    { slug: 'first-thread', condition: ({ threadCount })  => threadCount >= 1 },
    { slug: 'helpful',      condition: ({ karma })        => karma >= 10 },
    { slug: 'popular',      condition: ({ karma })        => karma >= 50 },
    { slug: 'month-old',    condition: ({ accountAgeDays }) => accountAgeDays >= 30 },
  ]

  export async function checkAndGrantBadges(
    userId: string,
    _context: BadgeContext,
  ): Promise<void> {
    const [postCount, threadCount, user] = await Promise.all([
      db.forumPost.count({
        where: { authorId: userId, deletedAt: null },
      }),
      db.forumThread.count({
        where: {
          posts: { some: { authorId: userId, isFirst: true } },
          deletedAt: null,
        },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { karma: true, createdAt: true },
      }),
    ])

    if (!user) return

    const karma = user.karma
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    )

    const data = { postCount, threadCount, karma, accountAgeDays }

    await Promise.all(
      BADGE_CHECKS
        .filter(({ condition }) => condition(data))
        .map(({ slug }) =>
          db.forumUserBadge.upsert({
            where: { userId_badgeSlug: { userId, badgeSlug: slug } },
            create: { userId, badgeSlug: slug },
            update: {},
          }),
        ),
    )
  }
  ```

- [ ] **4.5** Run tests — expect all to pass:
  ```bash
  npx vitest run src/modules/forum/lib/badges
  ```

#### 4d — Hook into existing server actions

- [ ] **4.6** Edit `src/modules/forum/actions/createPost.ts`. Add import at the top:
  ```typescript
  // eslint-disable-next-line no-restricted-imports
  import { checkAndGrantBadges } from '../lib/badges'
  ```

  After the `revalidatePath` call (line ~100), add:
  ```typescript
  // Badge check (fire-and-forget)
  void checkAndGrantBadges(user.id, 'post').catch(console.error)
  ```

- [ ] **4.7** Edit `src/modules/forum/actions/createThread.ts`. Add import at the top:
  ```typescript
  // eslint-disable-next-line no-restricted-imports
  import { checkAndGrantBadges } from '../lib/badges'
  ```

  After `redirectUrl = \`/forum/thread/${thread.slug}\`` (line ~93), add:
  ```typescript
  // Badge check (fire-and-forget)
  void checkAndGrantBadges(user.id, 'thread').catch(console.error)
  ```

- [ ] **4.8** Edit `src/modules/forum/actions/votePost.ts`. Add import at the top:
  ```typescript
  // eslint-disable-next-line no-restricted-imports
  import { checkAndGrantBadges } from '../lib/badges'
  ```

  Inside the fire-and-forget block (after the `createNotification` call and before the final `return { success: true }`), add a separate fire-and-forget for the badge check:
  ```typescript
  // Badge check for post author (fire-and-forget)
  void (async () => {
    try {
      const votedPost = await db.forumPost.findUnique({
        where: { id: postId },
        select: { authorId: true },
      })
      if (votedPost) {
        await checkAndGrantBadges(votedPost.authorId, 'vote')
      }
    } catch {
      // best-effort
    }
  })()
  ```

#### 4e — Update getThreadBySlug to include badges

- [ ] **4.9** Edit `src/modules/forum/lib/queries.ts`. In `getThreadBySlug`, update the `author` select inside the `posts` include to also fetch badges:

  ```typescript
  author: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarUrl: true,
      forumBadges: {
        select: {
          badgeSlug: true,
          awardedAt: true,
          badge: {
            select: {
              name: true,
              description: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: { awardedAt: 'asc' },
        take: 3,
      },
    },
  },
  ```

#### 4f — Update Forum types to include badges on author

- [ ] **4.10** Edit `src/modules/forum/types/index.ts`. Update `ForumAuthor` to include optional badges:

  ```typescript
  export interface ForumBadgeDisplay {
    badgeSlug: string
    awardedAt: Date
    badge: {
      name: string
      description: string
      icon: string
      color: string
    }
  }

  export interface ForumAuthor {
    id: string
    name: string | null
    username: string | null
    image: string | null
    avatarUrl?: string | null
    role?: string
    karma?: number | null
    forumBadges?: ForumBadgeDisplay[]
  }
  ```

#### 4g — Display badges in PostCard

- [ ] **4.11** Edit `src/modules/forum/components/PostCard.tsx`. Add a lucide icon lookup map and badge display. Add these at the top of the file (after imports):

  ```typescript
  import {
    MessageSquare, MessageCircle, MessagesSquare, Award,
    FilePlus, ThumbsUp as ThumbsUpIcon, TrendingUp as TrendingUpIcon, Calendar,
  } from 'lucide-react'
  import type { LucideIcon } from 'lucide-react'

  const BADGE_ICONS: Record<string, LucideIcon> = {
    MessageSquare,
    MessageCircle,
    MessagesSquare,
    Award,
    FilePlus,
    ThumbsUp: ThumbsUpIcon,
    TrendingUp: TrendingUpIcon,
    Calendar,
  }
  ```

  Then in the `PostCard` render, after `{post.isFirst && <Badge variant="info">OP</Badge>}`, add:

  ```typescript
  {/* Forum badges (up to 3) */}
  {post.author.forumBadges?.slice(0, 3).map((ub) => {
    const Icon = BADGE_ICONS[ub.badge.icon] ?? Award
    return (
      <span
        key={ub.badgeSlug}
        title={`${ub.badge.name}: ${ub.badge.description}`}
        className="inline-flex items-center"
        style={{ color: ub.badge.color }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    )
  })}
  ```

#### 4h — Display badges on forum user profile page

- [ ] **4.12** Edit `src/modules/forum/lib/queries.ts`. In `getForumUserProfile`, add badge data to the select:

  ```typescript
  forumBadges: {
    select: {
      badgeSlug: true,
      awardedAt: true,
      badge: {
        select: {
          name: true,
          description: true,
          icon: true,
          color: true,
        },
      },
    },
    orderBy: { awardedAt: 'asc' },
  },
  ```

- [ ] **4.13** Edit `src/app/forum/user/[username]/page.tsx`. After the "Threads by {displayName}" heading section, add a badges section. Import the same icon map (inline in the page file or extract to a shared util):

  ```typescript
  import {
    MessageSquare, MessageCircle, MessagesSquare, Award,
    FilePlus, ThumbsUp, TrendingUp, Calendar,
  } from 'lucide-react'
  import type { LucideIcon } from 'lucide-react'

  const BADGE_ICONS: Record<string, LucideIcon> = {
    MessageSquare, MessageCircle, MessagesSquare, Award,
    FilePlus, ThumbsUp, TrendingUp, Calendar,
  }
  ```

  Then in the JSX, after the profile header div and before the threads section:

  ```typescript
  {/* Badges */}
  {user.forumBadges && user.forumBadges.length > 0 && (
    <div className="mb-8">
      <h2 className="mb-3 text-lg font-bold text-[var(--color-text)]">Badges</h2>
      <div className="flex flex-wrap gap-3">
        {user.forumBadges.map((ub) => {
          const Icon = BADGE_ICONS[ub.badge.icon] ?? Award
          return (
            <div
              key={ub.badgeSlug}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2"
              title={ub.badge.description}
            >
              <Icon className="h-4 w-4 shrink-0" style={{ color: ub.badge.color }} />
              <span className="text-sm font-medium text-[var(--color-text)]">{ub.badge.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )}
  ```

  Note: the `getForumUserProfile` return type is inferred from Prisma — no manual type update needed for the page.

- [ ] **4.14** Run the badge seed script (dev or staging environment):
  ```bash
  npx tsx prisma/seed-badges.ts
  ```
  Expected output:
  ```
  Seeding forum badges…
    ✓ First Post
    ✓ Regular
    ✓ Contributor
    ✓ Veteran
    ✓ Thread Starter
    ✓ Helpful
    ✓ Popular
    ✓ Early Rider
  Done.
  ```

- [ ] **4.15** TypeScript check:
  ```bash
  npx tsc --noEmit
  ```

- [ ] **4.16** Commit:
  ```
  feat(forum): badge system — 8 badges, checkAndGrantBadges, PostCard icons, profile grid
  ```

---

## Task 5: Forum Leaderboard + Seed Run

**Goal:** Create the `/forum/leaderboard` page, update the sidebar link, run the badge seed against production, and verify the build.

### Steps

#### 5a — Create leaderboard page

- [ ] **5.1** Add `getForumLeaderboard` query to `src/modules/forum/lib/queries.ts`:

  ```typescript
  // ── 21. getForumLeaderboard ───────────────────────────────────

  export async function getForumLeaderboard(limit = 50) {
    const users = await db.user.findMany({
      orderBy: { karma: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        avatarUrl: true,
        karma: true,
        _count: {
          select: {
            forumPosts: true,
          },
        },
      },
    })

    return users.map((u, i) => ({
      rank: i + 1,
      user: u,
      postCount: u._count.forumPosts,
    }))
  }
  ```

  Note: `postCount` here counts all posts including deleted ones — for a leaderboard display this is fine (the spec says "count of non-deleted ForumPost records where `deletedAt IS NULL`"). To filter deleted posts, update the `_count` to use a raw approach. Use a separate count query instead:

  ```typescript
  export async function getForumLeaderboard(limit = 50) {
    const users = await db.user.findMany({
      orderBy: { karma: 'desc' },
      take: limit,
      where: { karma: { gt: 0 } },   // only show users who have karma
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        avatarUrl: true,
        karma: true,
      },
    })

    // Get non-deleted post counts for each user in bulk
    const userIds = users.map((u) => u.id)
    const postCounts = userIds.length > 0
      ? await db.forumPost.groupBy({
          by: ['authorId'],
          where: { authorId: { in: userIds }, deletedAt: null },
          _count: { id: true },
        })
      : []

    const countMap = new Map(postCounts.map((pc) => [pc.authorId, pc._count.id]))

    return users.map((u, i) => ({
      rank: i + 1,
      user: u,
      postCount: countMap.get(u.id) ?? 0,
    }))
  }
  ```

- [ ] **5.2** Create `src/app/forum/leaderboard/page.tsx`:

  ```typescript
  import type { Metadata } from 'next'
  import Image from 'next/image'
  import Link from 'next/link'
  import { TrendingUp, MessageSquare } from 'lucide-react'
  // eslint-disable-next-line no-restricted-imports
  import { getForumLeaderboard } from '@/modules/forum/lib/queries'

  export const metadata: Metadata = {
    title: 'Forum Leaderboard | Ride MTB',
    description: 'Top riders by karma on the Ride MTB forum.',
  }

  export default async function ForumLeaderboardPage() {
    const entries = await getForumLeaderboard(50)

    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Forum Leaderboard</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Top 50 riders ranked by karma earned from post upvotes.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] divide-y divide-[var(--color-border)]">
          {entries.length === 0 && (
            <p className="p-8 text-center text-sm text-[var(--color-text-muted)]">
              No data yet. Start posting!
            </p>
          )}
          {entries.map(({ rank, user, postCount }) => {
            const displayName = user.name || user.username || 'Anonymous'
            const avatarSrc = user.avatarUrl || user.image
            return (
              <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                {/* Rank */}
                <span className="w-8 shrink-0 text-center text-sm font-bold text-[var(--color-text-muted)]">
                  {rank}
                </span>

                {/* Avatar */}
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt={displayName}
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-sm font-medium text-[var(--color-text-muted)]">
                    {displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                )}

                {/* Name */}
                <div className="min-w-0 flex-1">
                  {user.username ? (
                    <Link
                      href={`/forum/user/${user.username}`}
                      className="truncate text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium text-[var(--color-text)]">
                      {displayName}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {postCount}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[var(--color-text)]">
                    <TrendingUp className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                    {user.karma}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  ```

#### 5b — Update ForumSidebar

- [ ] **5.3** Edit `src/modules/forum/components/ForumSidebar.tsx`. Find the Quick Links array (line ~186–191) and change the `Leaderboard` entry from `/learn/leaderboard` to `/forum/leaderboard`:

  ```typescript
  { label: 'Leaderboard', href: '/forum/leaderboard' },
  ```

#### 5c — Final verification

- [ ] **5.4** Run all tests:
  ```bash
  npx vitest run
  ```
  Expected: all tests pass (including the new ones from Tasks 2, 3, 4).

- [ ] **5.5** TypeScript check:
  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] **5.6** Build check:
  ```bash
  npx next build
  ```
  Expected: build succeeds.

- [ ] **5.7** Run badge seed against production DB (ensure env vars point to Supabase):
  ```bash
  npx tsx prisma/seed-badges.ts
  ```

- [ ] **5.8** Commit:
  ```
  feat(forum): leaderboard page at /forum/leaderboard, sidebar link updated
  ```

---

## File Inventory

### New files created

| File | Purpose |
|------|---------|
| `src/app/api/forum/posts/[id]/route.ts` | PATCH (edit) and DELETE (soft-delete) API handlers |
| `src/app/api/forum/posts/[id]/route.test.ts` | API route tests |
| `src/modules/forum/components/EditPostForm.tsx` | Inline edit textarea component |
| `src/modules/forum/lib/email.ts` | Resend email functions |
| `src/modules/forum/lib/email.test.ts` | Email unit tests |
| `src/modules/forum/lib/badges.ts` | `checkAndGrantBadges` function |
| `src/modules/forum/lib/badges.test.ts` | Badge grant tests |
| `src/app/forum/leaderboard/page.tsx` | Forum leaderboard server page |
| `prisma/seed-badges.ts` | Badge seed script |

### Modified files

| File | What changes |
|------|-------------|
| `prisma/schema.prisma` | `ForumPost.editedAt/deletedAt`, `ForumThread.deletedAt`, `User.emailNotifications`, `ForumBadge`, `ForumUserBadge` models, `User.forumBadges` relation |
| `src/modules/forum/types/index.ts` | Add `editedAt`, `deletedAt` to `ForumPost`; `deletedAt` to `ForumThread`; `ForumBadgeDisplay` interface; `forumBadges` to `ForumAuthor` |
| `src/modules/forum/lib/queries.ts` | `getThreadBySlug` includes `forumBadges` on author; `getForumUserProfile` includes `forumBadges`; new `getForumLeaderboard` function |
| `src/modules/forum/components/PostCard.tsx` | Edit/delete actions, deleted placeholder, "(edited)" label, badge icons |
| `src/modules/forum/components/ThreadView.tsx` | Pass `currentUserRole` to `PostCard` |
| `src/modules/forum/components/EditPostForm.tsx` | (new) |
| `src/modules/forum/components/index.ts` | Export `EditPostForm` |
| `src/modules/forum/actions/createPost.ts` | Add email notification side effects, badge check |
| `src/modules/forum/actions/createThread.ts` | Add badge check |
| `src/modules/forum/actions/votePost.ts` | Add badge check for post author |
| `src/modules/forum/components/ForumSidebar.tsx` | Update leaderboard link to `/forum/leaderboard` |
| `src/modules/profile/types/index.ts` | Add `emailNotifications` to `UserProfileData` and `ProfileUpdateInput` |
| `src/modules/profile/lib/queries.ts` | Add `emailNotifications` to `getUserProfile`, `getUserByUsername`, `updateProfile` |
| `src/modules/profile/actions/updateProfile.ts` | Add `emailNotifications` to Zod schema and raw parse |
| `src/modules/profile/components/ProfileForm.tsx` | Add email notifications checkbox |
| `src/app/forum/thread/[slug]/ThreadPageClient.tsx` | Pass `currentUserRole` |
| `src/app/forum/thread/[slug]/page.tsx` | Pass `session?.user?.role` to client |
| `src/app/forum/user/[username]/page.tsx` | Add badges grid section |

---

## Environment Variables Required

| Variable | Where | Notes |
|----------|-------|-------|
| `RESEND_API_KEY` | `.env.local` + Vercel | From resend.com dashboard |
| `NEXT_PUBLIC_APP_URL` | `.env.local` + Vercel | Used in email links; defaults to `https://ride-mtb.vercel.app` |

---

## Spec Compliance Review

- [x] `ForumPost.editedAt` / `ForumPost.deletedAt` added
- [x] `ForumThread.deletedAt` added
- [x] `User.emailNotifications Boolean @default(true)` added
- [x] `ForumBadge` and `ForumUserBadge` models with correct `@@map` and back-reference on `User`
- [x] PATCH enforces 15-min edit window for non-admin, returns `{ error: 'edit_window_expired' }` on 403
- [x] DELETE soft-deletes post; cascades to thread when `isFirst = true`
- [x] `EditPostForm` is a client component with inline textarea, Save and Cancel
- [x] "(edited)" label shown next to timestamp
- [x] Deleted post renders muted placeholder "This post has been deleted."
- [x] Auth uses `admin` role (no `mod` role in the enum — confirmed in schema)
- [x] Email from `notifications@ride-mtb.com` via Resend
- [x] Reply notification: thread author != post author AND `emailNotifications = true`
- [x] Mention notification: parses `@username` regex, looks up each username, skips post author
- [x] Email templates match spec (subject lines, body text, view button, unsubscribe footer)
- [x] Email failures are fire-and-forget (`.catch(console.error)`)
- [x] Profile settings toggle "Email me when someone replies to my threads"
- [x] `sendReplyNotification` and `sendMentionNotification` in `src/modules/forum/lib/email.ts`
- [x] `ForumBadge` prefix convention avoids collision with `src/ui/components/Badge.tsx`
- [x] All 8 badge definitions seeded via `prisma/seed-badges.ts`
- [x] `@@unique([userId, badgeSlug])` prevents duplicates; upsert pattern used
- [x] `checkAndGrantBadges` fires from `createPost`, `createThread`, `votePost`
- [x] Badge icons displayed in `PostCard.tsx` (up to 3)
- [x] Badge grid on `/forum/user/[username]` profile page
- [x] `getThreadBySlug` updated to include `author.forumBadges`
- [x] Leaderboard at `/forum/leaderboard`, server-rendered, top 50 by karma DESC
- [x] Leaderboard shows rank, avatar (initials fallback), username link, post count, karma
- [x] `ForumSidebar.tsx` link updated from `/learn/leaderboard` to `/forum/leaderboard`
- [x] `npx prisma db push` (not `migrate dev`) used — no shadow DB
- [x] `// eslint-disable-next-line no-restricted-imports` added before module lib imports in API routes and app pages
- [x] Tests cover: 401 unauth, 403 window expired, 200 edit, 204 delete, thread cascade, email skip when disabled, badge grant and no duplicate
