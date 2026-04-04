# Homepage SEO Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Ride MTB homepage and article pages discoverable by search engines, and show editorial content to logged-out visitors at `/` instead of a members-only feed.

**Architecture:** Next.js native metadata API (`generateMetadata`, `app/sitemap.ts`, `app/robots.ts`). Homepage conditionally renders `GuestHomeFeed` (new server component) for unauthenticated visitors and the existing personalized feed for members. Article pages get `alternates.canonical` and JSON-LD structured data.

**Tech Stack:** Next.js 15.5 App Router, NextAuth v5 (`auth()` from `@/lib/auth/config`), Prisma v7, Tailwind CSS v4

---

## Files Changed

| File | Action |
|------|--------|
| `src/modules/editorial/types/index.ts` | Modify — add `updatedAt: Date` to `ArticleDetail` |
| `src/modules/editorial/lib/queries.ts` | Modify — add `updatedAt` to `getArticleBySlug` return; add `getAllPublishedArticleSlugs()` |
| `src/modules/editorial/components/ArticleJsonLd.tsx` | Create — JSON-LD structured data component |
| `src/app/news/[slug]/page.tsx` | Modify — add `alternates.canonical`; render `<ArticleJsonLd>` |
| `src/modules/feed/components/GuestHomeFeed.tsx` | Create — guest editorial feed |
| `src/app/page.tsx` | Modify — add `export const metadata`; guest branch |
| `src/app/sitemap.ts` | Create — Next.js sitemap route |
| `src/app/robots.ts` | Create — Next.js robots route |

---

## Task 1: Add `updatedAt` to editorial types and queries

**Files:**
- Modify: `src/modules/editorial/types/index.ts`
- Modify: `src/modules/editorial/lib/queries.ts`

- [ ] **Step 1: Add `updatedAt` to `ArticleDetail`**

In `src/modules/editorial/types/index.ts`, find the `ArticleDetail` interface and add `updatedAt: Date` after `authorImage`:

```typescript
export interface ArticleDetail extends ArticleSummary {
  body: JSONContent
  authorImage: string | null
  updatedAt: Date   // add this line
}
```

- [ ] **Step 2: Add `updatedAt` to `getArticleBySlug` return**

In `src/modules/editorial/lib/queries.ts`, in the `getArticleBySlug` function, add `updatedAt: a.updatedAt` to the returned object. The query uses `include` so Prisma already fetches this field — we just need to surface it in the TypeScript shape.

- [ ] **Step 3: Add `getAllPublishedArticleSlugs` to queries**

At the bottom of `src/modules/editorial/lib/queries.ts`, add:

```typescript
export async function getAllPublishedArticleSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db.article.findMany({
    where: { status: 'published' },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: 'desc' },
  })
}
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors (or only pre-existing errors unrelated to these files)

- [ ] **Step 5: Commit**

```bash
git add src/modules/editorial/types/index.ts src/modules/editorial/lib/queries.ts
git commit -m "feat: add updatedAt to ArticleDetail type and getArticleBySlug return; add getAllPublishedArticleSlugs query"
```

---

## Task 2: Create ArticleJsonLd component

**Files:**
- Create: `src/modules/editorial/components/ArticleJsonLd.tsx`

Note: This component uses `dangerouslySetInnerHTML` to render a `<script type="application/ld+json">` tag. This is the correct pattern for JSON-LD structured data (inline script, not next/script). The content is constructed entirely from our own database fields via `JSON.stringify`, which handles all escaping — it is not derived from user input and is not an XSS risk.

- [ ] **Step 1: Create the component**

Create `src/modules/editorial/components/ArticleJsonLd.tsx`:

```typescript
import type { ArticleDetail } from '../types'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

interface ArticleJsonLdProps {
  article: ArticleDetail
}

export function ArticleJsonLd({ article }: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? article.title,
    ...(article.coverImageUrl && { image: article.coverImageUrl }),
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: article.authorName ?? 'Ride MTB',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ride MTB',
      url: BASE_URL,
    },
  }

  return (
    <script
      type="application/ld+json"
      // Safe: content is constructed from our own DB fields via JSON.stringify
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/editorial/components/ArticleJsonLd.tsx
git commit -m "feat: add ArticleJsonLd component for structured data on article pages"
```

---

## Task 3: Update article page — canonical + JSON-LD

**Files:**
- Modify: `src/app/news/[slug]/page.tsx`

The article page already has a `generateMetadata()` with title, OG, and Twitter tags. We only add `alternates.canonical` and render `<ArticleJsonLd>`.

- [ ] **Step 1: Add `alternates.canonical` to `generateMetadata()`**

In `src/app/news/[slug]/page.tsx`, find the existing `generateMetadata` function. It already uses `BASE_URL` (or `process.env.NEXT_PUBLIC_APP_URL`). Add `alternates.canonical` to the returned metadata object:

```typescript
alternates: {
  canonical: `${BASE_URL}/news/${slug}`,
},
```

If `BASE_URL` is not already defined as a constant in the file, add:
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'
```

- [ ] **Step 2: Import and render `ArticleJsonLd`**

Add the import at the top:
```typescript
import { ArticleJsonLd } from '@/modules/editorial/components/ArticleJsonLd'
```

In the page JSX, drop `<ArticleJsonLd article={article} />` alongside `<ArticleRenderer>` (or wherever the article content is rendered). The component renders a `<script>` tag, so placement in the JSX is flexible — putting it before `ArticleRenderer` is fine.

- [ ] **Step 3: Build to verify**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Smoke test — check HTML output**

```bash
# Start dev server in background, then curl an article
curl -s "http://localhost:3000/news/test-article" | grep -o 'application/ld+json'
curl -s "http://localhost:3000/news/test-article" | grep -o 'rel="canonical"'
```

Expected: each grep returns 1 match. (Requires dev server running and a published article to exist.)

- [ ] **Step 5: Commit**

```bash
git add src/app/news/\[slug\]/page.tsx
git commit -m "feat: add canonical URL and JSON-LD structured data to article pages"
```

---

## Task 4: Create GuestHomeFeed component

**Files:**
- Create: `src/modules/feed/components/GuestHomeFeed.tsx`

This component crosses module boundaries (imports from `editorial` and `events` inside the `feed` module). Use the eslint-disable block as shown — the project uses `no-restricted-imports` to enforce module boundaries, but this cross-module usage is intentional for the guest feed.

- [ ] **Step 1: Check the events query signature**

Before writing the component, confirm the signature of `getUpcomingEvents` and the `EventSummary` type. Read:

```
src/modules/events/lib/queries.ts
```

Look for `getUpcomingEvents` — note its parameters and return type. The homepage already calls it, so check `src/app/page.tsx` for the call pattern.

- [ ] **Step 2: Create the component**

Create `src/modules/feed/components/GuestHomeFeed.tsx`:

```typescript
/* eslint-disable no-restricted-imports */
import { getRecentPublishedArticles } from '@/modules/editorial/lib/queries'
import { ArticleCard } from '@/modules/editorial/components/ArticleCard'
import { getUpcomingEvents } from '@/modules/events/lib/queries'
/* eslint-enable no-restricted-imports */
import { getTrendingItems } from '../lib/queries'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'

export async function GuestHomeFeed() {
  const [articlesResult, trendingResult, eventsResult] = await Promise.allSettled([
    getRecentPublishedArticles(12),
    getTrendingItems(5),
    getUpcomingEvents(undefined, 1, 3),
  ])

  const articles = articlesResult.status === 'fulfilled' ? articlesResult.value : []
  const trendingItems = trendingResult.status === 'fulfilled' ? trendingResult.value : []
  // getUpcomingEvents returns { events, totalCount } — extract events
  const upcomingEvents =
    eventsResult.status === 'fulfilled' ? eventsResult.value.events : []

  return (
    <div className="mx-auto px-4 py-6" style={{ maxWidth: 'var(--max-content-width)' }}>
      <div className="homepage-grid">
        <LeftSidebar isLoggedIn={false} trendingItems={trendingItems} />
        <main>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Latest News
          </h2>
          {articles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No articles yet.</p>
          )}
        </main>
        <RightSidebar upcomingEvents={upcomingEvents} />
      </div>
    </div>
  )
}
```

Note: If `getUpcomingEvents` has a different signature than `(filter, page, limit)`, adjust the call to match what the homepage already uses.

- [ ] **Step 3: Build to verify**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/feed/components/GuestHomeFeed.tsx
git commit -m "feat: add GuestHomeFeed server component for unauthenticated homepage"
```

---

## Task 5: Update homepage — metadata + guest branch

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add `export const metadata`**

At the top of `src/app/page.tsx` (after imports), add the static metadata export. This provides site-level OG metadata visible to crawlers even before they follow any links:

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ride MTB — Mountain Bike Community',
  description: 'The MTB platform for riders. Trails, gear, community, learning.',
  openGraph: {
    type: 'website',
    title: 'Ride MTB — Mountain Bike Community',
    description: 'The MTB platform for riders. Trails, gear, community, learning.',
  },
}
```

- [ ] **Step 2: Add guest branch early return**

In the page component function, after calling `auth()`, add the guest branch before any member-specific data fetching:

```typescript
import { GuestHomeFeed } from '@/modules/feed/components/GuestHomeFeed'

// Inside the page component, after: const session = await auth()
if (!session?.user) {
  return (
    <>
      <HeroSection />
      <GuestHomeFeed />
    </>
  )
}
```

This renders the existing `HeroSection` (already imported) plus the new `GuestHomeFeed` for guests, and falls through to the full personalized feed for authenticated users.

- [ ] **Step 3: Build to verify**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Smoke test — guest view**

```bash
# Curl without cookies — should see article headlines in HTML
curl -s "http://localhost:3000/" | grep -i "Latest News"
```

Expected: returns the "Latest News" heading text from GuestHomeFeed.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add site metadata and guest homepage showing editorial feed for unauthenticated visitors"
```

---

## Task 6: Create `app/sitemap.ts`

**Files:**
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Create the sitemap route**

Create `src/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from 'next'
// eslint-disable-next-line no-restricted-imports
import { getAllPublishedArticleSlugs } from '@/modules/editorial/lib/queries'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articleSlugs = await getAllPublishedArticleSlugs()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,       lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
    { url: `${BASE_URL}/news`,   lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE_URL}/forum`,  lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8 },
    { url: `${BASE_URL}/trails`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/learn`,  lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/shops`,  lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ]

  const articleEntries: MetadataRoute.Sitemap = articleSlugs.map(({ slug, updatedAt }) => ({
    url: `${BASE_URL}/news/${slug}`,
    lastModified: updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticEntries, ...articleEntries]
}
```

- [ ] **Step 2: Build to verify**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Smoke test — sitemap XML**

```bash
curl -s "http://localhost:3000/sitemap.xml" | head -30
```

Expected: valid XML starting with `<?xml`, containing `<loc>https://ride-mtb.vercel.app/</loc>` and at least one `/news/` URL.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat: add Next.js sitemap route with static pages and all published articles"
```

---

## Task 7: Create `app/robots.ts`

**Files:**
- Create: `src/app/robots.ts`

- [ ] **Step 1: Create the robots route**

Create `src/app/robots.ts`:

```typescript
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 2: Build to verify**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Smoke test — robots.txt**

```bash
curl -s "http://localhost:3000/robots.txt"
```

Expected output contains:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Sitemap: https://ride-mtb.vercel.app/sitemap.xml
```

- [ ] **Step 4: Commit**

```bash
git add src/app/robots.ts
git commit -m "feat: add robots.txt route disallowing /admin and /api, pointing to sitemap"
```

---

## Final Verification Checklist

- [ ] `/` renders article content for a logged-out request (`curl` without cookies, check for "Latest News" in HTML)
- [ ] `/` renders the personalized feed for a logged-in session (check in browser after signing in)
- [ ] `/news/[slug]` HTML source contains `<script type="application/ld+json">` with `@type: Article`
- [ ] `/news/[slug]` HTML source contains `<link rel="canonical">`
- [ ] `/sitemap.xml` responds with valid XML containing static + dynamic URLs
- [ ] `/robots.txt` contains `Disallow: /admin` and the sitemap URL
- [ ] `npx tsc --noEmit` passes with no new errors
