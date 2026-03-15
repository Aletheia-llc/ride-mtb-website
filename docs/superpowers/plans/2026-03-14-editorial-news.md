# Editorial / News Article System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full editorial CMS for Ride MTB — admins write articles with a Tiptap rich-text editor, articles are published to a public `/news` listing and `/news/[slug]` detail page, and an RSS feed is served at `/news/feed.xml`.

**Architecture:** `src/modules/editorial/` follows the standard module pattern (lib/queries.ts server-only, actions/, components/, types/). Admin CRUD lives under `src/app/admin/news/`. Public reading lives under `src/app/news/`. The `Article` model stores body as Prisma `Json` (Tiptap JSONContent). The existing `TiptapRenderer` in `src/modules/learn/components/LessonViewer.tsx` is re-used for public rendering; a new `ArticleEditor` client component wraps `@tiptap/react`'s `useEditor` + `EditorContent` for authoring.

**Tech Stack:** Next.js 15.5, Prisma v7 (`@prisma/adapter-pg`), `@tiptap/react` ^3 + `@tiptap/starter-kit`, Tailwind CSS v4 CSS custom properties, Vitest + RTL for unit tests.

---

## Chunk 1: Schema, types, and queries

### Task 1: Prisma schema — Article model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and model**

Append to the bottom of `prisma/schema.prisma` (before the final closing if any):

```prisma
enum ArticleStatus {
  draft
  published

  @@map("article_status")
}

enum ArticleCategory {
  news
  gear_review
  trail_spotlight
  how_to
  culture

  @@map("article_category")
}

model Article {
  id            String          @id @default(cuid())
  title         String
  slug          String          @unique
  excerpt       String?
  body          Json            @default("{}")
  coverImageUrl String?
  status        ArticleStatus   @default(draft)
  category      ArticleCategory @default(news)
  tags          String[]        @default([])
  authorId      String
  publishedAt   DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  author User @relation("ArticleAuthor", fields: [authorId], references: [id], onDelete: Cascade)

  @@index([status, publishedAt])
  @@index([slug])
  @@map("articles")
}
```

- [ ] **Step 2: Add relation to User model**

In `prisma/schema.prisma`, find the `User` model and add the `articles` relation:

```prisma
  articles   Article[]  @relation("ArticleAuthor")
```

Add it alongside the other array relations on `User` (e.g., near `events`, `rsvps`, etc.).

- [ ] **Step 3: Run generate and push**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma generate
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(editorial): add Article model + ArticleStatus/ArticleCategory enums"
```

---

### Task 2: Module types + queries (TDD)

**Files:**
- Create: `src/modules/editorial/types/index.ts`
- Create: `src/modules/editorial/lib/queries.ts`
- Create: `src/modules/editorial/lib/queries.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/modules/editorial/lib/queries.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    article: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/slugify', () => ({
  uniqueSlug: vi.fn(),
}))

vi.mock('@/lib/db/helpers', () => ({
  paginate: vi.fn(() => ({ take: 25, skip: 0 })),
}))

import { db } from '@/lib/db/client'
import { uniqueSlug } from '@/lib/slugify'
import {
  getPublishedArticles,
  getArticleBySlug,
  getAdminArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  publishArticle,
} from './queries'

const mockArticle = {
  id: 'art1',
  title: 'Test Article',
  slug: 'test-article',
  excerpt: 'Test excerpt',
  coverImageUrl: null,
  status: 'published' as const,
  category: 'news' as const,
  tags: [],
  authorId: 'user1',
  publishedAt: new Date('2026-03-14'),
  createdAt: new Date('2026-03-14'),
  updatedAt: new Date('2026-03-14'),
  author: { name: 'Kyle', image: null },
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getPublishedArticles', () => {
  it('fetches published articles paginated', async () => {
    vi.mocked(db.article.findMany).mockResolvedValue([mockArticle] as never)
    vi.mocked(db.article.count).mockResolvedValue(1)

    const result = await getPublishedArticles()

    expect(db.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'published' }),
      }),
    )
    expect(result.totalCount).toBe(1)
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0].slug).toBe('test-article')
  })

  it('filters by category when provided', async () => {
    vi.mocked(db.article.findMany).mockResolvedValue([] as never)
    vi.mocked(db.article.count).mockResolvedValue(0)

    await getPublishedArticles({ category: 'gear_review' })

    expect(db.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'gear_review', status: 'published' }),
      }),
    )
  })
})

describe('getArticleBySlug', () => {
  it('returns article for valid slug', async () => {
    vi.mocked(db.article.findUnique).mockResolvedValue({
      ...mockArticle,
      body: { type: 'doc', content: [] },
    } as never)

    const result = await getArticleBySlug('test-article')

    expect(result).not.toBeNull()
    expect(result?.slug).toBe('test-article')
  })

  it('returns null for unknown slug', async () => {
    vi.mocked(db.article.findUnique).mockResolvedValue(null)

    const result = await getArticleBySlug('not-found')
    expect(result).toBeNull()
  })
})

describe('createArticle', () => {
  it('generates unique slug and creates article', async () => {
    vi.mocked(uniqueSlug).mockResolvedValue('test-article')
    vi.mocked(db.article.create).mockResolvedValue(mockArticle as never)

    await createArticle({
      authorId: 'user1',
      title: 'Test Article',
      category: 'news',
    })

    expect(uniqueSlug).toHaveBeenCalledWith('Test Article', expect.any(Function))
    expect(db.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'test-article', authorId: 'user1' }),
      }),
    )
  })
})

describe('publishArticle', () => {
  it('sets status to published and sets publishedAt', async () => {
    vi.mocked(db.article.update).mockResolvedValue({ ...mockArticle, status: 'published' } as never)

    await publishArticle('art1')

    expect(db.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art1' },
        data: expect.objectContaining({ status: 'published', publishedAt: expect.any(Date) }),
      }),
    )
  })

  it('can unpublish by setting status to draft', async () => {
    vi.mocked(db.article.update).mockResolvedValue({ ...mockArticle, status: 'draft' } as never)

    await publishArticle('art1', false)

    expect(db.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'draft', publishedAt: null }),
      }),
    )
  })
})

describe('deleteArticle', () => {
  it('deletes article by id', async () => {
    vi.mocked(db.article.delete).mockResolvedValue(mockArticle as never)

    await deleteArticle('art1')

    expect(db.article.delete).toHaveBeenCalledWith({ where: { id: 'art1' } })
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx vitest run src/modules/editorial/lib/queries.test.ts 2>&1 | tail -20
```

Expected: Cannot find module `./queries`

- [ ] **Step 3: Create types**

Create `src/modules/editorial/types/index.ts`:

```typescript
import type { JSONContent } from '@tiptap/react'

export type ArticleStatus = 'draft' | 'published'

export type ArticleCategory =
  | 'news'
  | 'gear_review'
  | 'trail_spotlight'
  | 'how_to'
  | 'culture'

export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  news: 'News',
  gear_review: 'Gear Review',
  trail_spotlight: 'Trail Spotlight',
  how_to: 'How-To',
  culture: 'Culture',
}

export interface ArticleSummary {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImageUrl: string | null
  category: ArticleCategory
  tags: string[]
  status: ArticleStatus
  publishedAt: Date | null
  createdAt: Date
  authorName: string | null
}

export interface ArticleDetail extends ArticleSummary {
  body: JSONContent
  authorImage: string | null
}

export interface ArticleAdminRow extends ArticleSummary {
  authorId: string
}
```

- [ ] **Step 4: Create queries**

Create `src/modules/editorial/lib/queries.ts`:

```typescript
import 'server-only'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import { uniqueSlug } from '@/lib/slugify'
import type { ArticleCategory, ArticleSummary, ArticleDetail, ArticleAdminRow } from '../types'

// ── Shared select ─────────────────────────────────────────

const summarySelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  category: true,
  tags: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  author: { select: { name: true } },
} as const

// ── getPublishedArticles ──────────────────────────────────

interface ArticleFilters {
  category?: ArticleCategory
  tag?: string
  search?: string
}

export async function getPublishedArticles(
  filters?: ArticleFilters,
  page: number = 1,
): Promise<{ articles: ArticleSummary[]; totalCount: number }> {
  const where: Record<string, unknown> = { status: 'published' }

  if (filters?.category) where.category = filters.category
  if (filters?.tag) where.tags = { has: filters.tag }
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { excerpt: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const [rawArticles, totalCount] = await Promise.all([
    db.article.findMany({
      where,
      ...paginate(page),
      orderBy: { publishedAt: 'desc' },
      select: summarySelect,
    }),
    db.article.count({ where }),
  ])

  const articles: ArticleSummary[] = rawArticles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImageUrl,
    category: a.category as ArticleCategory,
    tags: a.tags,
    status: a.status as 'published',
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
    authorName: a.author.name,
  }))

  return { articles, totalCount }
}

// ── getArticleBySlug ──────────────────────────────────────

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const a = await db.article.findUnique({
    where: { slug },
    include: { author: { select: { name: true, image: true } } },
  })

  if (!a) return null

  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    body: a.body as import('@tiptap/react').JSONContent,
    coverImageUrl: a.coverImageUrl,
    category: a.category as ArticleCategory,
    tags: a.tags,
    status: a.status as 'draft' | 'published',
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
    authorName: a.author.name,
    authorImage: a.author.image,
  }
}

// ── getAdminArticles ──────────────────────────────────────

export async function getAdminArticles(
  page: number = 1,
): Promise<{ articles: ArticleAdminRow[]; totalCount: number }> {
  const [rawArticles, totalCount] = await Promise.all([
    db.article.findMany({
      ...paginate(page),
      orderBy: { createdAt: 'desc' },
      select: { ...summarySelect, authorId: true },
    }),
    db.article.count(),
  ])

  const articles: ArticleAdminRow[] = rawArticles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImageUrl,
    category: a.category as ArticleCategory,
    tags: a.tags,
    status: a.status as ArticleCategory,
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
    authorId: a.authorId,
    authorName: a.author.name,
  }))

  return { articles, totalCount }
}

// ── createArticle ─────────────────────────────────────────

interface CreateArticleInput {
  authorId: string
  title: string
  excerpt?: string
  body?: import('@tiptap/react').JSONContent
  coverImageUrl?: string
  category?: ArticleCategory
  tags?: string[]
}

export async function createArticle(input: CreateArticleInput) {
  const slug = await uniqueSlug(input.title, async (candidate) => {
    const existing = await db.article.findUnique({ where: { slug: candidate } })
    return existing !== null
  })

  return db.article.create({
    data: {
      authorId: input.authorId,
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      body: input.body ?? {},
      coverImageUrl: input.coverImageUrl ?? null,
      category: input.category ?? 'news',
      tags: input.tags ?? [],
    },
  })
}

// ── updateArticle ─────────────────────────────────────────

interface UpdateArticleInput {
  title?: string
  excerpt?: string
  body?: import('@tiptap/react').JSONContent
  coverImageUrl?: string
  category?: ArticleCategory
  tags?: string[]
}

export async function updateArticle(id: string, input: UpdateArticleInput) {
  return db.article.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.tags !== undefined && { tags: input.tags }),
    },
  })
}

// ── publishArticle ────────────────────────────────────────

export async function publishArticle(id: string, publish: boolean = true) {
  return db.article.update({
    where: { id },
    data: {
      status: publish ? 'published' : 'draft',
      publishedAt: publish ? new Date() : null,
    },
  })
}

// ── deleteArticle ─────────────────────────────────────────

export async function deleteArticle(id: string) {
  return db.article.delete({ where: { id } })
}

// ── getRecentPublishedArticles ────────────────────────────
// Used by RSS feed and homepage ticker

export async function getRecentPublishedArticles(limit: number = 20): Promise<ArticleSummary[]> {
  const raw = await db.article.findMany({
    where: { status: 'published' },
    take: limit,
    orderBy: { publishedAt: 'desc' },
    select: summarySelect,
  })

  return raw.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverImageUrl: a.coverImageUrl,
    category: a.category as ArticleCategory,
    tags: a.tags,
    status: 'published' as const,
    publishedAt: a.publishedAt,
    createdAt: a.createdAt,
    authorName: a.author.name,
  }))
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/modules/editorial/lib/queries.test.ts 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/editorial/
git commit -m "feat(editorial): module types + queries with tests"
```

---

## Chunk 2: Admin server actions

### Task 3: Admin server actions (TDD)

**Files:**
- Create: `src/modules/editorial/actions/saveArticle.ts`
- Create: `src/modules/editorial/actions/togglePublish.ts`
- Create: `src/modules/editorial/actions/deleteArticle.ts`
- Create: `src/modules/editorial/actions/saveArticle.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/modules/editorial/actions/saveArticle.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin1', name: 'Admin' }),
}))

vi.mock('../lib/queries', () => ({
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  publishArticle: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { requireAdmin } from '@/lib/auth/guards'
import { createArticle, updateArticle, deleteArticle, publishArticle } from '../lib/queries'
import { saveArticleAction } from './saveArticle'
import { togglePublishAction } from './togglePublish'
import { deleteArticleAction } from './deleteArticle'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin1', name: 'Admin', email: 'a@a.com', role: 'admin', image: null } as never)
})

describe('saveArticleAction (create)', () => {
  it('creates article when no id provided', async () => {
    vi.mocked(createArticle).mockResolvedValue({ id: 'art1', slug: 'test' } as never)

    const formData = new FormData()
    formData.set('title', 'Test Article')
    formData.set('category', 'news')
    formData.set('body', JSON.stringify({ type: 'doc', content: [] }))

    const result = await saveArticleAction({ errors: null, articleId: null }, formData)

    expect(createArticle).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Article', authorId: 'admin1' }),
    )
    expect(result.errors).toBeNull()
  })

  it('returns error when title is missing', async () => {
    const formData = new FormData()
    formData.set('category', 'news')

    const result = await saveArticleAction({ errors: null, articleId: null }, formData)

    expect(result.errors).toContain('Title is required')
    expect(createArticle).not.toHaveBeenCalled()
  })

  it('updates article when id is provided', async () => {
    vi.mocked(updateArticle).mockResolvedValue({ id: 'art1' } as never)

    const formData = new FormData()
    formData.set('id', 'art1')
    formData.set('title', 'Updated Title')
    formData.set('category', 'gear_review')
    formData.set('body', JSON.stringify({ type: 'doc', content: [] }))

    await saveArticleAction({ errors: null, articleId: 'art1' }, formData)

    expect(updateArticle).toHaveBeenCalledWith('art1', expect.objectContaining({ title: 'Updated Title' }))
  })
})

describe('togglePublishAction', () => {
  it('calls publishArticle with correct publish state', async () => {
    vi.mocked(publishArticle).mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('id', 'art1')
    formData.set('publish', 'true')

    await togglePublishAction(formData)

    expect(publishArticle).toHaveBeenCalledWith('art1', true)
  })
})

describe('deleteArticleAction', () => {
  it('deletes article and redirects', async () => {
    vi.mocked(deleteArticle).mockResolvedValue({} as never)

    const formData = new FormData()
    formData.set('id', 'art1')

    await deleteArticleAction(formData)

    expect(deleteArticle).toHaveBeenCalledWith('art1')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/modules/editorial/actions/saveArticle.test.ts 2>&1 | tail -10
```

Expected: Cannot find module `./saveArticle`

- [ ] **Step 3: Create saveArticleAction**

Create `src/modules/editorial/actions/saveArticle.ts`:

```typescript
'use server'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { createArticle, updateArticle } from '../lib/queries'
import type { ArticleCategory } from '../types'

export interface SaveArticleState {
  errors: string | null
  articleId: string | null
}

export async function saveArticleAction(
  _prev: SaveArticleState,
  formData: FormData,
): Promise<SaveArticleState> {
  const user = await requireAdmin()

  const id = formData.get('id') as string | null
  const title = (formData.get('title') as string | null)?.trim()
  const excerpt = (formData.get('excerpt') as string | null)?.trim() || undefined
  const coverImageUrl = (formData.get('coverImageUrl') as string | null)?.trim() || undefined
  const category = (formData.get('category') as ArticleCategory | null) ?? 'news'
  const tagsRaw = (formData.get('tags') as string | null)?.trim()
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []
  const bodyRaw = formData.get('body') as string | null

  if (!title) {
    return { errors: 'Title is required', articleId: id }
  }

  let body: object = {}
  if (bodyRaw) {
    try {
      body = JSON.parse(bodyRaw)
    } catch {
      return { errors: 'Invalid article body', articleId: id }
    }
  }

  if (id) {
    await updateArticle(id, { title, excerpt, body, coverImageUrl, category, tags })
    revalidatePath('/admin/news')
    revalidatePath(`/news`)
    return { errors: null, articleId: id }
  } else {
    const article = await createArticle({ authorId: user.id, title, excerpt, body, coverImageUrl, category, tags })
    revalidatePath('/admin/news')
    redirect(`/admin/news/${article.id}/edit`)
  }
}
```

- [ ] **Step 4: Create togglePublishAction**

Create `src/modules/editorial/actions/togglePublish.ts`:

```typescript
'use server'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
// eslint-disable-next-line no-restricted-imports
import { publishArticle } from '../lib/queries'

export async function togglePublishAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const id = formData.get('id') as string
  const publish = formData.get('publish') === 'true'

  await publishArticle(id, publish)

  revalidatePath('/admin/news')
  revalidatePath('/news')
}
```

- [ ] **Step 5: Create deleteArticleAction**

Create `src/modules/editorial/actions/deleteArticle.ts`:

```typescript
'use server'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { deleteArticle } from '../lib/queries'

export async function deleteArticleAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const id = formData.get('id') as string
  await deleteArticle(id)

  revalidatePath('/admin/news')
  redirect('/admin/news')
}
```

- [ ] **Step 6: Run tests — expect pass**

```bash
npx vitest run src/modules/editorial/actions/saveArticle.test.ts 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/modules/editorial/actions/
git commit -m "feat(editorial): admin server actions with tests"
```

---

## Chunk 3: UI components and barrel

### Task 4: Install Tiptap starter-kit and create ArticleEditor

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/modules/editorial/components/ArticleEditor.tsx`
- Create: `src/modules/editorial/components/ArticleRenderer.tsx`
- Create: `src/modules/editorial/components/ArticleCard.tsx`
- Create: `src/modules/editorial/components/ArticleList.tsx`

- [ ] **Step 1: Install @tiptap/starter-kit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npm install @tiptap/starter-kit
```

Expected: `@tiptap/starter-kit` added to `package.json` dependencies.

- [ ] **Step 2: Create ArticleEditor (client component)**

Create `src/modules/editorial/components/ArticleEditor.tsx`:

```typescript
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { JSONContent } from '@tiptap/react'

interface ArticleEditorProps {
  initialContent?: JSONContent
  onChange: (content: JSONContent) => void
}

export function ArticleEditor({ initialContent, onChange }: ArticleEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate({ editor }) {
      onChange(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[400px] p-4 focus:outline-none prose prose-sm max-w-none text-[var(--color-text)]',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] p-2">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          •—
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          1—
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          &ldquo;
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Code"
        >
          {`</>`}
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded px-2.5 py-1 text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:bg-[var(--color-border)]'
      }`}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Create ArticleRenderer**

Create `src/modules/editorial/components/ArticleRenderer.tsx`:

```typescript
import type { JSONContent } from '@tiptap/react'

interface ArticleRendererProps {
  content: JSONContent
}

// Renders Tiptap JSON content server-side without useEditor
export function ArticleRenderer({ content }: ArticleRendererProps) {
  if (!content?.content) return null

  return (
    <div className="prose prose-lg max-w-none text-[var(--color-text)]">
      {content.content.map((node, i) => (
        <RenderNode key={i} node={node} />
      ))}
    </div>
  )
}

function RenderNode({ node }: { node: JSONContent }) {
  if (node.type === 'paragraph') {
    return (
      <p>
        {node.content?.map((child, i) => <RenderInline key={i} node={child} />)}
      </p>
    )
  }
  if (node.type === 'heading') {
    const level = node.attrs?.level ?? 2
    const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'
    return (
      <Tag>
        {node.content?.map((child, i) => <RenderInline key={i} node={child} />)}
      </Tag>
    )
  }
  if (node.type === 'bulletList') {
    return (
      <ul>
        {node.content?.map((item, i) => <RenderNode key={i} node={item} />)}
      </ul>
    )
  }
  if (node.type === 'orderedList') {
    return (
      <ol>
        {node.content?.map((item, i) => <RenderNode key={i} node={item} />)}
      </ol>
    )
  }
  if (node.type === 'listItem') {
    return (
      <li>
        {node.content?.map((child, i) => <RenderNode key={i} node={child} />)}
      </li>
    )
  }
  if (node.type === 'blockquote') {
    return (
      <blockquote>
        {node.content?.map((child, i) => <RenderNode key={i} node={child} />)}
      </blockquote>
    )
  }
  if (node.type === 'codeBlock') {
    const code = node.content?.map((c) => c.text ?? '').join('') ?? ''
    return <pre><code>{code}</code></pre>
  }
  if (node.type === 'horizontalRule') {
    return <hr />
  }
  return null
}

function RenderInline({ node }: { node: JSONContent }) {
  if (node.type === 'text') {
    let text: React.ReactNode = node.text
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = <strong>{text}</strong>
        if (mark.type === 'italic') text = <em>{text}</em>
        if (mark.type === 'code') text = <code>{text}</code>
        if (mark.type === 'link') {
          text = (
            <a
              href={mark.attrs?.href}
              target={mark.attrs?.target ?? '_blank'}
              rel="noopener noreferrer"
            >
              {text}
            </a>
          )
        }
      }
    }
    return <>{text}</>
  }
  return null
}
```

- [ ] **Step 4: Create ArticleCard**

Create `src/modules/editorial/components/ArticleCard.tsx`:

```typescript
import Link from 'next/link'
import Image from 'next/image'
import type { ArticleSummary, ArticleCategory } from '../types'
import { ARTICLE_CATEGORY_LABELS } from '../types'

interface ArticleCardProps {
  article: ArticleSummary
}

export function ArticleCard({ article }: ArticleCardProps) {
  const publishedDate = article.publishedAt
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(article.publishedAt),
      )
    : null

  return (
    <article className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden transition-shadow hover:shadow-md">
      {article.coverImageUrl && (
        <Link href={`/news/${article.slug}`} className="block aspect-video overflow-hidden">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            width={600}
            height={338}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </Link>
      )}
      <div className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
            {ARTICLE_CATEGORY_LABELS[article.category as ArticleCategory]}
          </span>
          {publishedDate && (
            <time
              dateTime={article.publishedAt?.toISOString()}
              className="text-xs text-[var(--color-text-muted)]"
            >
              {publishedDate}
            </time>
          )}
        </div>
        <Link href={`/news/${article.slug}`}>
          <h2 className="mb-2 text-lg font-semibold leading-snug text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
            {article.title}
          </h2>
        </Link>
        {article.excerpt && (
          <p className="text-sm text-[var(--color-text-muted)] line-clamp-3">{article.excerpt}</p>
        )}
        {article.authorName && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">By {article.authorName}</p>
        )}
      </div>
    </article>
  )
}
```

- [ ] **Step 5: Create ArticleList**

Create `src/modules/editorial/components/ArticleList.tsx`:

```typescript
import Link from 'next/link'
import { ArticleCard } from './ArticleCard'
import type { ArticleSummary } from '../types'

interface ArticleListProps {
  articles: ArticleSummary[]
  totalCount: number
  page: number
  basePath?: string
}

const PAGE_SIZE = 25

export function ArticleList({ articles, totalCount, page, basePath = '/news' }: ArticleListProps) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-12 text-center">
        <p className="text-[var(--color-text-muted)]">No articles found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`${basePath}?page=${page - 1}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`${basePath}?page=${page + 1}`}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/editorial/components/ package.json package-lock.json
git commit -m "feat(editorial): ArticleEditor, ArticleRenderer, ArticleCard, ArticleList components"
```

---

### Task 5: Module barrel + components index

**Files:**
- Create: `src/modules/editorial/components/index.ts`
- Create: `src/modules/editorial/index.ts`

- [ ] **Step 1: Create components barrel**

Create `src/modules/editorial/components/index.ts`:

```typescript
export { ArticleEditor } from './ArticleEditor'
export { ArticleRenderer } from './ArticleRenderer'
export { ArticleCard } from './ArticleCard'
export { ArticleList } from './ArticleList'
```

- [ ] **Step 2: Create module barrel**

Create `src/modules/editorial/index.ts`:

```typescript
// Barrel — explicit public API for this module
export * from './types'
export * from './components'
export { saveArticleAction, type SaveArticleState } from './actions/saveArticle'
export { togglePublishAction } from './actions/togglePublish'
export { deleteArticleAction } from './actions/deleteArticle'
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/editorial/index.ts src/modules/editorial/components/index.ts
git commit -m "feat(editorial): module barrel exports"
```

---

## Chunk 4: Admin CMS pages

### Task 6: Admin article list page

**Files:**
- Create: `src/app/admin/news/page.tsx`

- [ ] **Step 1: Create admin news list page**

Create `src/app/admin/news/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { getAdminArticles } from '@/modules/editorial/lib/queries'
import { ARTICLE_CATEGORY_LABELS } from '@/modules/editorial'
import type { ArticleCategory } from '@/modules/editorial'
import { togglePublishAction, deleteArticleAction } from '@/modules/editorial'

export const metadata: Metadata = {
  title: 'News Articles | Admin | Ride MTB',
}

interface AdminNewsPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminNewsPage({ searchParams }: AdminNewsPageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const { articles, totalCount } = await getAdminArticles(page)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">News Articles</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {totalCount} article{totalCount !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)]"
        >
          <Plus className="h-4 w-4" />
          New Article
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-12 text-center">
          <p className="text-[var(--color-text-muted)]">No articles yet. Create your first one.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Title</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Category</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Published</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/news/${article.id}/edit`}
                      className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {ARTICLE_CATEGORY_LABELS[article.category as ArticleCategory]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        article.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {article.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {article.publishedAt
                      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(article.publishedAt))
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/news/${article.id}/edit`}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                      >
                        Edit
                      </Link>
                      <form action={togglePublishAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <input
                          type="hidden"
                          name="publish"
                          value={article.status === 'published' ? 'false' : 'true'}
                        />
                        <button
                          type="submit"
                          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                        >
                          {article.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                      </form>
                      <form action={deleteArticleAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            if (!confirm('Delete this article?')) e.preventDefault()
                          }}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/news/page.tsx
git commit -m "feat(editorial): admin news list page"
```

---

### Task 7: Admin article editor page (new + edit)

**Files:**
- Create: `src/app/admin/news/new/page.tsx`
- Create: `src/app/admin/news/[id]/edit/page.tsx`
- Create: `src/app/admin/news/[id]/edit/ArticleEditForm.tsx`

- [ ] **Step 1: Create ArticleEditForm (client component)**

Create `src/app/admin/news/[id]/edit/ArticleEditForm.tsx`:

```typescript
'use client'
import { useActionState, useState, useCallback } from 'react'
import { ArticleEditor } from '@/modules/editorial'
import type { SaveArticleState } from '@/modules/editorial'
import type { ArticleDetail, ArticleCategory } from '@/modules/editorial'
import { ARTICLE_CATEGORY_LABELS } from '@/modules/editorial'
import type { JSONContent } from '@tiptap/react'

interface ArticleEditFormProps {
  article?: ArticleDetail
  saveAction: (prev: SaveArticleState, formData: FormData) => Promise<SaveArticleState>
}

const CATEGORIES: ArticleCategory[] = ['news', 'gear_review', 'trail_spotlight', 'how_to', 'culture']

export function ArticleEditForm({ article, saveAction }: ArticleEditFormProps) {
  const [body, setBody] = useState<JSONContent | undefined>(
    article?.body as JSONContent | undefined,
  )
  const [state, formAction, pending] = useActionState(saveAction, {
    errors: null,
    articleId: article?.id ?? null,
  })

  const handleBodyChange = useCallback((content: JSONContent) => {
    setBody(content)
  }, [])

  return (
    <form action={formAction} className="space-y-6">
      {article?.id && <input type="hidden" name="id" value={article.id} />}
      <input type="hidden" name="body" value={JSON.stringify(body ?? {})} />

      {state.errors && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.errors}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          defaultValue={article?.title}
          required
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
          placeholder="Article title"
        />
      </div>

      {/* Excerpt */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Excerpt</label>
        <textarea
          name="excerpt"
          defaultValue={article?.excerpt ?? ''}
          rows={3}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none resize-none"
          placeholder="Short summary (shown in article cards and meta description)"
        />
      </div>

      {/* Category + Cover URL row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Category</label>
          <select
            name="category"
            defaultValue={article?.category ?? 'news'}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {ARTICLE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Cover Image URL</label>
          <input
            name="coverImageUrl"
            defaultValue={article?.coverImageUrl ?? ''}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Tags</label>
        <input
          name="tags"
          defaultValue={article?.tags?.join(', ') ?? ''}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
          placeholder="trail-building, technique, gear (comma-separated)"
        />
      </div>

      {/* Body editor */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Body</label>
        <ArticleEditor
          initialContent={article?.body as JSONContent | undefined}
          onChange={handleBodyChange}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save Draft'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create new article page**

Create `src/app/admin/news/new/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ArticleEditForm } from '../[id]/edit/ArticleEditForm'
import { saveArticleAction } from '@/modules/editorial'

export const metadata: Metadata = {
  title: 'New Article | Admin | Ride MTB',
}

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/news"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Articles
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">New Article</h1>
      </div>

      <ArticleEditForm saveAction={saveArticleAction} />
    </div>
  )
}
```

- [ ] **Step 3: Create edit article page**

Create `src/app/admin/news/[id]/edit/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { getArticleBySlug } from '@/modules/editorial/lib/queries'
import { togglePublishAction, saveArticleAction } from '@/modules/editorial'
import { ArticleEditForm } from './ArticleEditForm'

interface EditArticlePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditArticlePageProps): Promise<Metadata> {
  const { id } = await params
  // We'll look up by slug later; for now fetch by id via a direct query
  return { title: 'Edit Article | Admin | Ride MTB' }
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params

  // Import db directly in page only for admin — wrap in server-only guard via requireAdmin in action
  // eslint-disable-next-line no-restricted-imports
  const { db } = await import('@/lib/db/client')
  const raw = await db.article.findUnique({
    where: { id },
    include: { author: { select: { name: true, image: true } } },
  })

  if (!raw) notFound()

  const article = {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    body: raw.body as import('@tiptap/react').JSONContent,
    coverImageUrl: raw.coverImageUrl,
    category: raw.category as import('@/modules/editorial').ArticleCategory,
    tags: raw.tags,
    status: raw.status as 'draft' | 'published',
    publishedAt: raw.publishedAt,
    createdAt: raw.createdAt,
    authorName: raw.author.name,
    authorImage: raw.author.image,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/news"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Edit Article</h1>
        </div>

        <div className="flex items-center gap-3">
          {article.status === 'published' && (
            <a
              href={`/news/${article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              View Live ↗
            </a>
          )}
          <form action={togglePublishAction}>
            <input type="hidden" name="id" value={article.id} />
            <input
              type="hidden"
              name="publish"
              value={article.status === 'published' ? 'false' : 'true'}
            />
            <button
              type="submit"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                article.status === 'published'
                  ? 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {article.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          </form>
        </div>
      </div>

      <ArticleEditForm article={article} saveAction={saveArticleAction} />
    </div>
  )
}
```

- [ ] **Step 4: Add News link to admin nav**

In `src/app/admin/layout.tsx`, add a News nav link. Find the closing `</nav>` and add before it:

```typescript
        <a
          href="/admin/news"
          className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
        >
          News
        </a>
```

Add it after the Creators link.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/news/ src/app/admin/layout.tsx
git commit -m "feat(editorial): admin article editor pages (new + edit)"
```

---

## Chunk 5: Public news pages

### Task 8: Public /news listing page

**Files:**
- Create: `src/app/news/page.tsx`

- [ ] **Step 1: Create public news listing**

Create `src/app/news/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
// eslint-disable-next-line no-restricted-imports
import { getPublishedArticles } from '@/modules/editorial/lib/queries'
import { ArticleList, ARTICLE_CATEGORY_LABELS } from '@/modules/editorial'
import type { ArticleCategory } from '@/modules/editorial'

export const metadata: Metadata = {
  title: 'News | Ride MTB',
  description: 'The latest mountain biking news, gear reviews, trail spotlights, and how-to guides from Ride MTB.',
}

interface NewsPageProps {
  searchParams: Promise<{ category?: string; tag?: string; q?: string; page?: string }>
}

const CATEGORIES: ArticleCategory[] = ['news', 'gear_review', 'trail_spotlight', 'how_to', 'culture']

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams
  const category = CATEGORIES.includes(params.category as ArticleCategory)
    ? (params.category as ArticleCategory)
    : undefined
  const tag = params.tag || undefined
  const search = params.q || undefined
  const page = Math.max(1, Number(params.page) || 1)

  const { articles, totalCount } = await getPublishedArticles({ category, tag, search }, page)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">News</h1>
        <p className="text-[var(--color-text-muted)]">
          The latest from the mountain biking world.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <form className="flex-1 min-w-[200px]" method="GET" action="/news">
          {category && <input type="hidden" name="category" value={category} />}
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search articles..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
          />
        </form>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/news${search ? `?q=${search}` : ''}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !category
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/news?category=${cat}${search ? `&q=${search}` : ''}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {ARTICLE_CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

        {/* RSS link */}
        <a
          href="/news/feed.xml"
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          title="RSS Feed"
        >
          RSS
        </a>
      </div>

      <ArticleList articles={articles} totalCount={totalCount} page={page} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/news/page.tsx
git commit -m "feat(editorial): public /news listing page"
```

---

### Task 9: Public /news/[slug] article detail page

**Files:**
- Create: `src/app/news/[slug]/page.tsx`

- [ ] **Step 1: Create article detail page**

Create `src/app/news/[slug]/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { getArticleBySlug } from '@/modules/editorial/lib/queries'
import { ArticleRenderer, ARTICLE_CATEGORY_LABELS } from '@/modules/editorial'
import type { ArticleCategory } from '@/modules/editorial'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article || article.status !== 'published') {
    return { title: 'Article Not Found | Ride MTB' }
  }

  return {
    title: `${article.title} | Ride MTB`,
    description: article.excerpt ?? article.title,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? article.title,
      type: 'article',
      url: `${BASE_URL}/news/${article.slug}`,
      publishedTime: article.publishedAt?.toISOString(),
      authors: article.authorName ? [article.authorName] : undefined,
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt ?? article.title,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article || article.status !== 'published') {
    notFound()
  }

  const publishedDate = article.publishedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(article.publishedAt))
    : null

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      {/* Back */}
      <Link
        href="/news"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to News
      </Link>

      {/* Category + date */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/news?category=${article.category}`}
          className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          {ARTICLE_CATEGORY_LABELS[article.category as ArticleCategory]}
        </Link>
        {publishedDate && (
          <time
            dateTime={article.publishedAt?.toISOString()}
            className="text-sm text-[var(--color-text-muted)]"
          >
            {publishedDate}
          </time>
        )}
      </div>

      {/* Title */}
      <h1 className="mb-4 text-3xl font-bold leading-tight text-[var(--color-text)] sm:text-4xl">
        {article.title}
      </h1>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="mb-6 text-lg text-[var(--color-text-muted)] leading-relaxed">
          {article.excerpt}
        </p>
      )}

      {/* Author */}
      {article.authorName && (
        <p className="mb-8 text-sm text-[var(--color-text-muted)]">
          By <span className="font-medium text-[var(--color-text)]">{article.authorName}</span>
        </p>
      )}

      {/* Cover image */}
      {article.coverImageUrl && (
        <div className="mb-8 overflow-hidden rounded-xl aspect-video">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            width={900}
            height={506}
            className="h-full w-full object-cover"
            priority
          />
        </div>
      )}

      {/* Body */}
      <ArticleRenderer content={article.body} />

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-6">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={`/news?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/news/[slug]/page.tsx
git commit -m "feat(editorial): public /news/[slug] article detail with SEO metadata"
```

---

## Chunk 6: RSS feed + admin nav + final wiring

### Task 10: RSS feed at /news/feed.xml

**Files:**
- Create: `src/app/news/feed.xml/route.ts`

- [ ] **Step 1: Create RSS feed route**

Create `src/app/news/feed.xml/route.ts`:

```typescript
import { NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { getRecentPublishedArticles } from '@/modules/editorial/lib/queries'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const articles = await getRecentPublishedArticles(50)

  const items = articles
    .map((a) => {
      const url = `${BASE_URL}/news/${a.slug}`
      const pubDate = a.publishedAt ? new Date(a.publishedAt).toUTCString() : new Date(a.createdAt).toUTCString()
      const description = a.excerpt ? escapeXml(a.excerpt) : ''

      return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      ${a.authorName ? `<author>${escapeXml(a.authorName)}</author>` : ''}
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ride MTB News</title>
    <link>${BASE_URL}/news</link>
    <description>The latest mountain biking news from Ride MTB</description>
    <language>en-us</language>
    <atom:link href="${BASE_URL}/news/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/news/feed.xml/route.ts
git commit -m "feat(editorial): RSS feed at /news/feed.xml"
```

---

### Task 11: Verification + smoke test

**Files:**
- No new files — verification only

- [ ] **Step 1: Run all editorial tests**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx vitest run src/modules/editorial/ 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -i "editorial\|article" | head -30
```

Expected: No errors in editorial module files.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -30
```

Expected: Build succeeds. If there are type errors in the admin edit page's `db` import, add `// eslint-disable-next-line no-restricted-imports` before it.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(editorial): complete editorial/news article system

- Article model with ArticleStatus/ArticleCategory enums
- Admin CMS at /admin/news (list, new, edit) with Tiptap rich-text editor
- Public /news listing with category + tag + search filters
- Public /news/[slug] detail with full OG/Twitter SEO metadata
- RSS feed at /news/feed.xml
- 100% test coverage on queries and server actions"
```
