# Homepage SEO Design

## Goal

Make the Ride MTB homepage and article pages discoverable by search engines, and show editorial content to logged-out visitors at `/` instead of a members-only feed.

## Architecture

Option A — Next.js native metadata API with conditional homepage rendering. No new dependencies. Uses `generateMetadata()`, `app/sitemap.ts`, `app/robots.ts`, and a conditional render branch in `app/page.tsx`.

## Section 1: Guest Homepage (`app/page.tsx`)

`app/page.tsx` already calls `auth()` from `@/lib/auth/config` (NextAuth v5 pattern) for personalization. We add a branch: if no session, render `GuestHomeFeed` instead of the personalized member feed. The URL `/` serves both audiences.

`GuestHomeFeed` is a new server component at `src/modules/feed/components/GuestHomeFeed.tsx` that fetches three data sources in parallel using `Promise.allSettled`:
- Recent published articles via `getRecentPublishedArticles(12)` (editorial queries, already exists — purpose-built for this use case, returns a flat array)
- Upcoming events via the existing events query already used on the homepage
- Trending forum threads via `getTrendingItems()` (feed queries, already exists)

If any individual fetch fails, the others still render. Failed fetches fall back to an empty array.

Layout: articles in a main column, events + trending in a right sidebar. Matches the existing two-column homepage layout so the logged-in/guest transition is visually seamless. A sticky signup banner sits at the top of the guest view ("Join Ride MTB — free for riders").

`app/page.tsx` also gets a `generateMetadata()` export:
- `title`: "Ride MTB — Mountain Bike Community"
- `description`: "The MTB platform for riders. Trails, gear, community, learning."
- `openGraph.type`: `website`
- `openGraph.image`: static brand/logo image

## Section 2: Article Page SEO (`app/news/[slug]/page.tsx`)

**Note:** The article page already has a partial `generateMetadata()` implementation with basic title/OG tags. The delta here is: adding `alternates.canonical`, and adding JSON-LD structured data. The existing metadata is not replaced — only extended.

### Prerequisite: add `updatedAt` to editorial types and query

`updatedAt` exists on the `Article` Prisma model but is not currently selected in `getArticleBySlug()` and is absent from `ArticleDetail` and `ArticleSummary` in `src/modules/editorial/types/index.ts`. Before the article page changes:
1. Add `updatedAt: Date` to `ArticleDetail` in `types/index.ts` (`ArticleSummary` does not need this field — it is not used for SEO metadata)
2. Add `updatedAt: true` to the select in `getArticleBySlug()` in `lib/queries.ts`

### `generateMetadata()` additions

The canonical URL should use the existing `NEXT_PUBLIC_APP_URL` env var pattern already present in the file:

```
alternates:
  canonical: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'}/news/{slug}`
```

All other OG/Twitter tags already exist in the partial implementation and do not need to change.

### JSON-LD Structured Data

A new `ArticleJsonLd` server component at `src/modules/editorial/components/ArticleJsonLd.tsx` accepts an `ArticleDetail` prop (with `updatedAt` added as above) and renders a `<script type="application/ld+json">` tag inline in the article page JSX (inline is correct for structured data — do not use `next/script`):

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "...",
  "description": "...",
  "image": "...",
  "datePublished": "...",
  "dateModified": "...",
  "author": { "@type": "Person", "name": "..." },
  "publisher": {
    "@type": "Organization",
    "name": "Ride MTB",
    "url": "https://ride-mtb.vercel.app"
  }
}
```

`ArticleJsonLd` is dropped into the article page JSX alongside `ArticleRenderer`.

## Section 3: Sitemap + robots.txt

### `app/sitemap.ts`

Next.js generates `/sitemap.xml` from this file.

Static entries:
| URL | changeFrequency | priority |
|-----|----------------|----------|
| `/` | daily | 1.0 |
| `/news` | daily | 0.9 |
| `/forum` | daily | 0.8 |
| `/trails` | weekly | 0.7 |
| `/learn` | weekly | 0.7 |
| `/shops` | weekly | 0.6 |

Dynamic entries: all published articles. Use a dedicated lightweight query `getAllPublishedArticleSlugs()` (new, added to `src/modules/editorial/lib/queries.ts`) that selects only `slug` and `updatedAt` — not the full article row. This keeps the sitemap query fast regardless of article count.

- URL: `/news/{slug}`
- changeFrequency: `weekly`
- priority: `0.8`
- lastModified: `article.updatedAt`

### `app/robots.ts`

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Sitemap: https://ride-mtb.vercel.app/sitemap.xml
```

## Files Changed

| File | Change |
|------|--------|
| `src/app/page.tsx` | Add `generateMetadata()` + guest branch rendering `GuestHomeFeed` |
| `src/app/news/[slug]/page.tsx` | Add `alternates.canonical` to existing `generateMetadata()` + render `<ArticleJsonLd>` |
| `src/modules/editorial/types/index.ts` | Add `updatedAt: Date` to `ArticleDetail` |
| `src/modules/editorial/lib/queries.ts` | Add `updatedAt: true` to `getArticleBySlug()` select; add `getAllPublishedArticleSlugs()` |
| `src/modules/editorial/components/ArticleJsonLd.tsx` | New — JSON-LD structured data component |
| `src/modules/feed/components/GuestHomeFeed.tsx` | New — guest homepage editorial feed |
| `src/app/sitemap.ts` | New — Next.js sitemap route |
| `src/app/robots.ts` | New — Next.js robots route |

## Error Handling

- If `getArticleBySlug()` returns null in `generateMetadata()`, return minimal metadata (site title only) — same behavior as the existing 404 path.
- `GuestHomeFeed` uses `Promise.allSettled` for its three parallel fetches. Each failed fetch falls back to an empty array so partial content renders rather than a full error.
- Sitemap generation failure returns a 500; no special handling beyond what Next.js provides by default.

## Testing

- Verify `/` renders article content for a logged-out request (`curl` without cookies, check for article headlines in HTML)
- Verify `/` renders the personalized feed for a logged-in session
- Verify `/news/[slug]` HTML source contains `<script type="application/ld+json">` with `@type: Article`
- Verify `/news/[slug]` HTML source contains `<link rel="canonical">`
- Verify `/sitemap.xml` responds with valid XML containing static + dynamic URLs
- Verify `/robots.txt` contains `Disallow: /admin` and the sitemap URL
