# Creator Video Pipeline — Phase 2A (Next.js App) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Next.js side of the creator video pipeline: video submission, VAST ad serving, impression tracking, wallet/payouts, creator dashboard tabs, admin panels, and YouTube RSS cron.

**Architecture:** The Next.js app enqueues `video.ingest` jobs via pg-boss (enqueue-only mode using the existing `pg.Pool`). A separate Fly.io worker (Phase 2B) consumes those jobs. All ad serving, impression tracking, and wallet crediting happen entirely within Next.js API routes. Creator dashboard tabs are updated from Phase 1 stubs to real data-driven components.

**Tech Stack:** Next.js 15 App Router, Prisma v7, pg-boss v10, video.js + vast-client, SendGrid (already configured), Stripe Connect (already configured), Upstash Redis (rate limiting), Vitest

---

## File Map

**New files:**
- `src/lib/pgboss.ts` — singleton pg-boss client (enqueue only)
- `src/modules/creators/lib/youtube.ts` — YouTube Data API: resolve channel URL→ID, fetch video metadata, parse RSS XML
- `src/modules/creators/lib/youtube.test.ts`
- `src/modules/creators/lib/vast.ts` — VAST 2.0 XML builder
- `src/modules/creators/lib/vast.test.ts`
- `src/modules/creators/lib/wallet.ts` — wallet balance + transaction queries
- `src/modules/creators/lib/wallet.test.ts`
- `src/modules/creators/actions/submitVideo.ts` — validate YouTube URL, deduplicate, enqueue ingest job
- `src/modules/creators/actions/submitVideo.test.ts`
- `src/modules/creators/actions/connectChannel.ts` — resolve channel URL→ID, enqueue back-catalog (no unit test — depends on YouTube API; covered by integration smoke test)
- `src/modules/creators/actions/publishVideo.ts` — confirm AI tags, set status=live
- `src/modules/creators/actions/publishVideo.test.ts`
- `src/modules/creators/actions/requestPayout.ts` — create PayoutRequest if balance ≥ 5000
- `src/modules/creators/actions/requestPayout.test.ts`
- `src/modules/creators/components/VideoList.tsx` — video list with status badges + submit form
- `src/modules/creators/components/WalletTab.tsx` — balance, transactions, payout button
- `src/modules/creators/components/TagConfirmationForm.tsx` — confirm AI tags for pending_review videos
- `src/modules/creators/components/AdminCampaignPanel.tsx` — ad campaign list + create form
- `src/modules/creators/components/AdminPayoutsPanel.tsx` — pending payouts + trigger transfer
- `src/app/creators/videos/[videoId]/page.tsx` — video watch page (video.js + VAST pre-roll)
- `src/app/admin/creators/campaigns/page.tsx`
- `src/app/admin/creators/payouts/page.tsx`
- `src/app/api/creators/videos/route.ts` — POST submit YouTube video URL
- `src/app/api/creators/ads/vast/route.ts` — GET VAST 2.0 XML
- `src/app/api/creators/ads/track/route.ts` — POST track impression event
- `src/app/api/cron/youtube-rss/route.ts` — poll creator RSS feeds, enqueue new videos

**Modified files:**
- `src/lib/db/client.ts` — export `pool` so pg-boss can reuse it
- `src/lib/env.ts` — add BUNNY_CDN_HOSTNAME, YOUTUBE_API_KEY (both optional)
- `src/modules/creators/lib/queries.ts` — add video list query, wallet queries
- `src/modules/creators/components/CreatorDashboard.tsx` — accept real data, wire tabs
- `src/modules/creators/index.ts` — update barrel exports
- `src/app/dashboard/creator/page.tsx` — pass real video/wallet data to CreatorDashboard
- `src/app/api/stripe/webhook/route.ts` — add transfer.paid + transfer.failed handlers
- `src/app/admin/layout.tsx` — add Campaigns + Payouts nav links
- `vercel.json` — add youtube-rss cron (15-min, requires Vercel Pro)

---

## Chunk 1: Infrastructure

### Task 1: Install dependencies + env + cron config

**Files:**
- Modify: `package.json` (npm install)
- Modify: `src/lib/env.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Install pg-boss, video.js, vast-client**

```bash
npm install pg-boss video.js vast-client
npm install --save-dev @types/pg-boss
```

- [ ] **Step 2: Verify installs**

```bash
node -e "require('pg-boss'); require('video.js'); require('vast-client'); console.log('ok')"
```
Expected: `ok`

- [ ] **Step 3: Add env vars to `src/lib/env.ts`**

After the existing `STRIPE_WEBHOOK_SECRET` line, add:

```typescript
  BUNNY_CDN_HOSTNAME: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_BUNNY_CDN_HOSTNAME: z.string().optional(),
```

- [ ] **Step 4: Add youtube-rss cron to `vercel.json`**

Add to the `crons` array (requires Vercel Pro for 15-min interval):

```json
{
  "path": "/api/cron/youtube-rss",
  "schedule": "*/15 * * * *"
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/env.ts vercel.json
git commit -m "feat: install pg-boss + video.js + vast-client, add env vars, youtube-rss cron"
```

---

### Task 2: pg-boss enqueue client

**Files:**
- Modify: `src/lib/db/client.ts` (export pool)
- Create: `src/lib/pgboss.ts`

- [ ] **Step 1: Export `pool` from `src/lib/db/client.ts`**

Find the line that reads `const pool = globalForDb.pool ?? new Pool({` and add the `export` keyword. Only the `export` keyword changes — all constructor arguments stay exactly as they are in the existing file:

```diff
- const pool = globalForDb.pool ?? new Pool({
+ export const pool = globalForDb.pool ?? new Pool({
```

- [ ] **Step 2: Type-check after export change**

```bash
npx tsc --noEmit
```
Expected: no errors (nothing else imports `pool` yet)

- [ ] **Step 3: Create `src/lib/pgboss.ts`**

```typescript
import 'server-only'
import PgBoss from 'pg-boss'
import { pool } from './db/client'

const globalForBoss = globalThis as unknown as { boss: PgBoss | undefined }

export async function getBoss(): Promise<PgBoss> {
  if (!globalForBoss.boss) {
    // pg-boss v10 requires a `db` adapter object with `executeSql`, not a raw pg.Pool
    const boss = new PgBoss({
      db: {
        executeSql: async (text: string, values?: unknown[]) =>
          pool.query(text, values as unknown[]),
      },
    })
    await boss.start()
    // Store unconditionally — both dev and production must reuse the singleton
    // to avoid creating a new pg-boss instance on every serverless invocation
    globalForBoss.boss = boss
    return boss
  }
  return globalForBoss.boss
}

export type JobName = 'video.ingest' | 'video.transcode' | 'video.tag'

export interface VideoIngestPayload {
  youtubeVideoId: string
  creatorId: string
  source: 'manual' | 'rss' | 'backcatalog'
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/client.ts src/lib/pgboss.ts
git commit -m "feat: export pool from db client, add pg-boss enqueue client"
```

---

### Task 3: YouTube lib (TDD)

**Files:**
- Create: `src/modules/creators/lib/youtube.ts`
- Create: `src/modules/creators/lib/youtube.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/modules/creators/lib/youtube.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractYouTubeVideoId,
  extractChannelHandle,
  formatDuration,
} from './youtube'

describe('extractYouTubeVideoId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from youtu.be short URL', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for non-YouTube URL', () => {
    expect(extractYouTubeVideoId('https://vimeo.com/123456')).toBeNull()
  })

  it('returns null for bare channel URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/@rideMTB')).toBeNull()
  })
})

describe('extractChannelHandle', () => {
  it('extracts handle from @username URL', () => {
    expect(extractChannelHandle('https://www.youtube.com/@rideMTB')).toBe('@rideMTB')
  })

  it('extracts channel ID from /channel/ URL', () => {
    expect(extractChannelHandle('https://www.youtube.com/channel/UCxxxxxx')).toBe('UCxxxxxx')
  })

  it('returns null for non-channel URL', () => {
    expect(extractChannelHandle('https://www.youtube.com/watch?v=abc')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('converts ISO 8601 PT4M13S to seconds', () => {
    expect(formatDuration('PT4M13S')).toBe(253)
  })

  it('converts PT1H2M3S to seconds', () => {
    expect(formatDuration('PT1H2M3S')).toBe(3723)
  })

  it('converts PT30S to seconds', () => {
    expect(formatDuration('PT30S')).toBe(30)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/modules/creators/lib/youtube.test.ts
```
Expected: FAIL — "Cannot find module './youtube'"

- [ ] **Step 3: Implement `src/modules/creators/lib/youtube.ts`**

```typescript
import 'server-only'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// ── Pure utility functions (no API calls, fully testable) ──

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('/')[0] || null
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v')
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null
    }
    return null
  } catch {
    return null
  }
}

export function extractChannelHandle(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('youtube.com')) return null
    const match = u.pathname.match(/^\/@([\w-]+)/)
    if (match) return `@${match[1]}`
    const channelMatch = u.pathname.match(/^\/channel\/(UC[\w-]{22})/)
    if (channelMatch) return channelMatch[1]
    return null
  } catch {
    return null
  }
}

export function formatDuration(iso8601: string): number {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const h = parseInt(match[1] ?? '0')
  const m = parseInt(match[2] ?? '0')
  const s = parseInt(match[3] ?? '0')
  return h * 3600 + m * 60 + s
}

// ── YouTube Data API calls ──

export async function resolveChannelId(handleOrId: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.warn('[youtube] YOUTUBE_API_KEY not configured')
    return null
  }

  // Already a channel ID (starts with UC, 24 chars)
  if (/^UC[\w-]{22}$/.test(handleOrId)) return handleOrId

  const handle = handleOrId.startsWith('@') ? handleOrId.slice(1) : handleOrId
  const url = `${YOUTUBE_API_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as { items?: Array<{ id: string }> }
  return data.items?.[0]?.id ?? null
}

export interface YouTubeVideoMeta {
  youtubeVideoId: string
  title: string
  description: string
  thumbnailUrl: string
  duration: number // seconds
}

export async function fetchVideoMetadata(youtubeVideoId: string): Promise<YouTubeVideoMeta | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return null

  const url = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,status&id=${youtubeVideoId}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as {
    items?: Array<{
      snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default: { url: string } } }
      contentDetails: { duration: string }
      status: { privacyStatus: string; madeForKids: boolean }
    }>
  }
  const item = data.items?.[0]
  if (!item) return null
  // Skip private/unlisted/age-restricted
  if (item.status.privacyStatus !== 'public') return null
  if (item.status.madeForKids) return null

  return {
    youtubeVideoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default.url,
    duration: formatDuration(item.contentDetails.duration),
  }
}

export async function fetchChannelBackCatalog(channelId: string, limit = 50): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return []

  const videoIds: string[] = []
  let pageToken: string | undefined

  while (videoIds.length < limit) {
    const params = new URLSearchParams({
      part: 'id',
      channelId,
      maxResults: '50',
      order: 'date',
      type: 'video',
      key: apiKey,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`)
    if (!res.ok) break
    const data = await res.json() as {
      items?: Array<{ id: { videoId: string } }>
      nextPageToken?: string
    }
    for (const item of data.items ?? []) {
      videoIds.push(item.id.videoId)
      if (videoIds.length >= limit) break
    }
    if (!data.nextPageToken || videoIds.length >= limit) break
    pageToken = data.nextPageToken
  }

  return videoIds.slice(0, limit)
}

export async function parseRssFeed(channelId: string): Promise<string[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const res = await fetch(rssUrl)
  if (!res.ok) return []
  const xml = await res.text()
  const matches = xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)
  return Array.from(matches, (m) => m[1])
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/modules/creators/lib/youtube.test.ts
```
Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/creators/lib/youtube.ts src/modules/creators/lib/youtube.test.ts
git commit -m "feat: YouTube lib — extractors, metadata fetch, RSS parser (TDD)"
```

---

### Task 4: VAST 2.0 XML builder (TDD)

**Files:**
- Create: `src/modules/creators/lib/vast.ts`
- Create: `src/modules/creators/lib/vast.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/modules/creators/lib/vast.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildVastXml, buildEmptyVast } from './vast'

describe('buildEmptyVast', () => {
  it('returns minimal VAST 2.0 with no Ad element', () => {
    const xml = buildEmptyVast()
    expect(xml).toContain('<VAST version="2.0"/>')
    expect(xml).not.toContain('<Ad')
  })
})

describe('buildVastXml', () => {
  const input = {
    impressionId: 'imp_abc123',
    creativeUrl: 'https://cdn.bunny.net/ads/creative.mp4',
    advertiserName: 'Acme Bikes',
    baseUrl: 'https://ride-mtb.vercel.app',
    durationSeconds: 30,
  }

  it('includes VAST 2.0 version', () => {
    expect(buildVastXml(input)).toContain('version="2.0"')
  })

  it('includes impression tracking URL', () => {
    const xml = buildVastXml(input)
    expect(xml).toContain('/api/creators/ads/track?impressionId=imp_abc123&event=impression')
  })

  it('includes complete tracking URL', () => {
    const xml = buildVastXml(input)
    expect(xml).toContain('event=complete')
  })

  it('includes skip tracking URL', () => {
    const xml = buildVastXml(input)
    expect(xml).toContain('event=skip')
  })

  it('includes creative URL in MediaFile', () => {
    const xml = buildVastXml(input)
    expect(xml).toContain('https://cdn.bunny.net/ads/creative.mp4')
  })

  it('encodes advertiser name safely', () => {
    const xml = buildVastXml({ ...input, advertiserName: '<script>xss</script>' })
    expect(xml).not.toContain('<script>')
    expect(xml).toContain('&lt;script&gt;')
  })

  it('sets skip offset to 5 seconds', () => {
    expect(buildVastXml(input)).toContain('skipoffset="00:00:05"')
  })

  it('formats duration correctly', () => {
    expect(buildVastXml(input)).toContain('<Duration>00:00:30</Duration>')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/modules/creators/lib/vast.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/modules/creators/lib/vast.ts`**

```typescript
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function secondsToHms(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function buildEmptyVast(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="2.0"/>'
}

interface VastInput {
  impressionId: string
  creativeUrl: string
  advertiserName: string
  baseUrl: string
  durationSeconds: number
}

export function buildVastXml({
  impressionId,
  creativeUrl,
  advertiserName,
  baseUrl,
  durationSeconds,
}: VastInput): string {
  const track = (event: string) =>
    `${baseUrl}/api/creators/ads/track?impressionId=${impressionId}&event=${event}`

  return `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="2.0">
  <Ad id="${impressionId}">
    <InLine>
      <AdSystem>Ride MTB Ads</AdSystem>
      <AdTitle><![CDATA[${escapeXml(advertiserName)}]]></AdTitle>
      <Impression id="start"><![CDATA[${track('impression')}]]></Impression>
      <Creatives>
        <Creative>
          <Linear skipoffset="00:00:05">
            <Duration>${secondsToHms(durationSeconds)}</Duration>
            <TrackingEvents>
              <Tracking event="complete"><![CDATA[${track('complete')}]]></Tracking>
              <Tracking event="skip"><![CDATA[${track('skip')}]]></Tracking>
            </TrackingEvents>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720" bitrate="2000">
                <![CDATA[${creativeUrl}]]>
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/modules/creators/lib/vast.test.ts
```
Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/creators/lib/vast.ts src/modules/creators/lib/vast.test.ts
git commit -m "feat: VAST 2.0 XML builder with impression/complete/skip tracking (TDD)"
```

---

### Task 5: Wallet queries (TDD)

**Files:**
- Create: `src/modules/creators/lib/wallet.ts`
- Create: `src/modules/creators/lib/wallet.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/modules/creators/lib/wallet.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWalletBalance, hasPendingPayout } from './wallet'

vi.mock('@/lib/db/client', () => ({
  db: {
    walletTransaction: {
      aggregate: vi.fn(),
    },
    payoutRequest: {
      findFirst: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db/client'

beforeEach(() => vi.clearAllMocks())

describe('getWalletBalance', () => {
  it('returns sum of amountCents', async () => {
    vi.mocked(db.walletTransaction.aggregate).mockResolvedValue({
      _sum: { amountCents: 12500 },
    } as never)
    expect(await getWalletBalance('creator_1')).toBe(12500)
  })

  it('returns 0 when no transactions exist', async () => {
    vi.mocked(db.walletTransaction.aggregate).mockResolvedValue({
      _sum: { amountCents: null },
    } as never)
    expect(await getWalletBalance('creator_1')).toBe(0)
  })
})

describe('hasPendingPayout', () => {
  it('returns true when pending request exists', async () => {
    vi.mocked(db.payoutRequest.findFirst).mockResolvedValue({ id: 'pr_1' } as never)
    expect(await hasPendingPayout('creator_1')).toBe(true)
  })

  it('returns false when no pending request', async () => {
    vi.mocked(db.payoutRequest.findFirst).mockResolvedValue(null)
    expect(await hasPendingPayout('creator_1')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/modules/creators/lib/wallet.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/modules/creators/lib/wallet.ts`**

```typescript
import 'server-only'
import { db } from '@/lib/db/client'

export async function getWalletBalance(creatorProfileId: string): Promise<number> {
  const result = await db.walletTransaction.aggregate({
    where: { creatorId: creatorProfileId },
    _sum: { amountCents: true },
  })
  return result._sum.amountCents ?? 0
}

export interface WalletTransactionRow {
  id: string
  amountCents: number
  type: string
  createdAt: Date
}

export async function getWalletTransactions(
  creatorProfileId: string,
  limit = 20,
): Promise<WalletTransactionRow[]> {
  return db.walletTransaction.findMany({
    where: { creatorId: creatorProfileId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, amountCents: true, type: true, createdAt: true },
  })
}

export async function hasPendingPayout(creatorProfileId: string): Promise<boolean> {
  const existing = await db.payoutRequest.findFirst({
    where: { creatorId: creatorProfileId, status: 'pending' },
    select: { id: true },
  })
  return existing !== null
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/modules/creators/lib/wallet.test.ts
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/creators/lib/wallet.ts src/modules/creators/lib/wallet.test.ts
git commit -m "feat: wallet queries — balance aggregate, transactions, pending payout check (TDD)"
```

---

## Chunk 2: API Layer

### Task 6: Video submission API (TDD)

**Files:**
- Create: `src/app/api/creators/videos/route.ts`
- Create: `src/app/api/creators/videos/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/api/creators/videos/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: { findUnique: vi.fn() },
    creatorVideo: { findUnique: vi.fn(), create: vi.fn() },
  },
}))
vi.mock('@/lib/pgboss', () => ({
  getBoss: vi.fn().mockResolvedValue({ send: vi.fn().mockResolvedValue('job-id') }),
}))

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getBoss } from '@/lib/pgboss'

const mockCreator = { id: 'creator_1', status: 'active', userId: 'user_1' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user_1', email: 'a@b.com', role: 'user' } as never)
  vi.mocked(db.creatorProfile.findUnique).mockResolvedValue(mockCreator as never)
})

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/creators/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/creators/videos', () => {
  it('rejects non-YouTube URLs', async () => {
    const res = await POST(makeRequest({ youtubeUrl: 'https://vimeo.com/123' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('YouTube')
  })

  it('rejects duplicate video', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue({ id: 'vid_1' } as never)
    const res = await POST(makeRequest({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }))
    expect(res.status).toBe(409)
    // Verify the compound unique key name is used correctly
    expect(db.creatorVideo.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { creatorId_youtubeVideoId: { creatorId: 'creator_1', youtubeVideoId: 'dQw4w9WgXcQ' } },
      }),
    )
  })

  it('enqueues video.ingest job and creates CreatorVideo record', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue(null)
    vi.mocked(db.creatorVideo.create).mockResolvedValue({ id: 'vid_new' } as never)
    const mockSend = vi.fn().mockResolvedValue('job-id')
    vi.mocked(getBoss).mockResolvedValue({ send: mockSend } as never)

    const res = await POST(makeRequest({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }))
    expect(res.status).toBe(201)
    expect(mockSend).toHaveBeenCalledWith('video.ingest', expect.objectContaining({
      youtubeVideoId: 'dQw4w9WgXcQ',
      creatorId: 'creator_1',
      source: 'manual',
    }))
  })

  it('returns 403 if creator profile not active', async () => {
    vi.mocked(db.creatorProfile.findUnique).mockResolvedValue({ ...mockCreator, status: 'onboarding' } as never)
    const res = await POST(makeRequest({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }))
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/app/api/creators/videos/route.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/app/api/creators/videos/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import { getBoss } from '@/lib/pgboss'
import { extractYouTubeVideoId } from '@/modules/creators/lib/youtube'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await requireAuth()

  const body = await req.json() as { youtubeUrl?: unknown }
  if (typeof body.youtubeUrl !== 'string') {
    return NextResponse.json({ error: 'youtubeUrl is required' }, { status: 400 })
  }

  const videoId = extractYouTubeVideoId(body.youtubeUrl)
  if (!videoId) {
    return NextResponse.json({ error: 'Not a valid YouTube video URL' }, { status: 400 })
  }

  const creator = await db.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  })
  if (!creator || creator.status !== 'active') {
    return NextResponse.json({ error: 'Creator account not active' }, { status: 403 })
  }

  const existing = await db.creatorVideo.findUnique({
    where: { creatorId_youtubeVideoId: { creatorId: creator.id, youtubeVideoId: videoId } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'Video already submitted' }, { status: 409 })
  }

  const video = await db.creatorVideo.create({
    data: {
      creatorId: creator.id,
      youtubeVideoId: videoId,
      title: `YouTube video ${videoId}`, // worker will update with real metadata
      status: 'queued',
    },
    select: { id: true },
  })

  const boss = await getBoss()
  await boss.send('video.ingest', { youtubeVideoId: videoId, creatorId: creator.id, source: 'manual' })

  return NextResponse.json({ videoId: video.id }, { status: 201 })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/app/api/creators/videos/route.test.ts
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/creators/videos/route.ts src/app/api/creators/videos/route.test.ts
git commit -m "feat: video submission API — validate YouTube URL, deduplicate, enqueue ingest job (TDD)"
```

---

### Task 7: VAST endpoint (TDD)

**Files:**
- Create: `src/app/api/creators/ads/vast/route.ts`
- Create: `src/app/api/creators/ads/vast/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/api/creators/ads/vast/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  db: {
    creatorVideo: { findUnique: vi.fn() },
    adCampaign: { findFirst: vi.fn() },
    adImpression: { count: vi.fn(), create: vi.fn() },
  },
}))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn() }))

import { db } from '@/lib/db/client'
import { rateLimit } from '@/lib/rate-limit'

const mockVideo = {
  id: 'vid_1',
  creatorId: 'creator_1',
  category: 'trails',
  status: 'live',
}

const mockCampaign = {
  id: 'camp_1',
  advertiserName: 'Acme Bikes',
  creativeUrl: 'https://cdn.bunny.net/ads/acme.mp4',
  cpmCents: 800,
  dailyImpressionCap: 100,
  creatorTargets: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.creatorVideo.findUnique).mockResolvedValue(mockVideo as never)
  vi.mocked(db.adCampaign.findFirst).mockResolvedValue(mockCampaign as never)
  vi.mocked(db.adImpression.count).mockResolvedValue(0)
  vi.mocked(db.adImpression.create).mockResolvedValue({ id: 'imp_1' } as never)
})

function makeRequest(videoId: string) {
  return new NextRequest(`http://localhost/api/creators/ads/vast?videoId=${videoId}`)
}

describe('GET /api/creators/ads/vast', () => {
  it('returns empty VAST when rate limit exceeded', async () => {
    vi.mocked(rateLimit).mockRejectedValue(new Error('Rate limit exceeded'))
    const res = await GET(makeRequest('vid_1'))
    expect(res.headers.get('content-type')).toContain('application/xml')
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns empty VAST when videoId missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/creators/ads/vast'))
    expect(res.headers.get('content-type')).toContain('application/xml')
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns empty VAST when video not found', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue(null)
    const res = await GET(makeRequest('missing'))
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns empty VAST when no eligible campaign', async () => {
    vi.mocked(db.adCampaign.findFirst).mockResolvedValue(null)
    const res = await GET(makeRequest('vid_1'))
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns empty VAST when daily cap reached', async () => {
    vi.mocked(db.adImpression.count).mockResolvedValue(100)
    const res = await GET(makeRequest('vid_1'))
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0"/>')
  })

  it('returns VAST XML with ad when campaign available', async () => {
    const res = await GET(makeRequest('vid_1'))
    expect(res.headers.get('content-type')).toContain('application/xml')
    const text = await res.text()
    expect(text).toContain('<VAST version="2.0">')
    expect(text).toContain('Acme Bikes')
    expect(text).toContain('acme.mp4')
  })

  it('creates pending AdImpression record', async () => {
    await GET(makeRequest('vid_1'))
    expect(db.adImpression.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ campaignId: 'camp_1', videoId: 'vid_1', status: 'pending' }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/app/api/creators/ads/vast/route.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/app/api/creators/ads/vast/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { rateLimit } from '@/lib/rate-limit'
import { buildVastXml, buildEmptyVast } from '@/modules/creators/lib/vast'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function xmlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  try {
    await rateLimit({ identifier: ip, action: 'vast', maxPerMinute: 30 })
  } catch {
    return xmlResponse(buildEmptyVast())
  }

  const videoId = req.nextUrl.searchParams.get('videoId')
  if (!videoId) return xmlResponse(buildEmptyVast())

  const video = await db.creatorVideo.findUnique({
    where: { id: videoId },
    select: { id: true, creatorId: true, category: true, status: true },
  })
  if (!video || video.status !== 'live') return xmlResponse(buildEmptyVast())

  const now = new Date()
  const campaign = await db.adCampaign.findFirst({
    where: {
      status: 'active',
      startDate: { lte: now },
      endDate: { gte: now },
      OR: [{ categoryFilter: null }, { categoryFilter: video.category }],
      AND: [
        {
          OR: [
            { creatorTargets: { none: {} } },
            { creatorTargets: { some: { creatorProfileId: video.creatorId } } },
          ],
        },
      ],
    },
    orderBy: [{ cpmCents: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      advertiserName: true,
      creativeUrl: true,
      cpmCents: true,
      dailyImpressionCap: true,
      creatorTargets: { select: { creatorProfileId: true } },
    },
  })
  if (!campaign) return xmlResponse(buildEmptyVast())

  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const todayCount = await db.adImpression.count({
    where: { campaignId: campaign.id, createdAt: { gte: startOfDay } },
  })
  if (todayCount >= campaign.dailyImpressionCap) return xmlResponse(buildEmptyVast())

  const impression = await db.adImpression.create({
    data: { campaignId: campaign.id, videoId: video.id, status: 'pending' },
    select: { id: true },
  })

  const xml = buildVastXml({
    impressionId: impression.id,
    creativeUrl: campaign.creativeUrl,
    advertiserName: campaign.advertiserName,
    baseUrl: BASE_URL,
    durationSeconds: 30,
  })

  return xmlResponse(xml)
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/app/api/creators/ads/vast/route.test.ts
```
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/creators/ads/vast/route.ts src/app/api/creators/ads/vast/route.test.ts
git commit -m "feat: VAST 2.0 ad endpoint — campaign selection, daily cap, impression creation (TDD)"
```

---

### Task 8: Impression tracking endpoint (TDD)

**Files:**
- Create: `src/app/api/creators/ads/track/route.ts`
- Create: `src/app/api/creators/ads/track/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/api/creators/ads/track/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  db: {
    adImpression: { findUnique: vi.fn(), update: vi.fn() },
    creatorVideo: { findUnique: vi.fn() },
    walletTransaction: { create: vi.fn() },
  },
}))

import { db } from '@/lib/db/client'

const now = new Date()
const freshImpression = {
  id: 'imp_1',
  status: 'pending',
  createdAt: new Date(now.getTime() - 60_000), // 1 min ago
  campaignId: 'camp_1',
  videoId: 'vid_1',
  campaign: { cpmCents: 1000 },
  video: { creatorId: 'creator_1', creator: { revenueSharePct: 70 } },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.adImpression.findUnique).mockResolvedValue(freshImpression as never)
  vi.mocked(db.adImpression.update).mockResolvedValue({ ...freshImpression, status: 'confirmed' } as never)
  vi.mocked(db.walletTransaction.create).mockResolvedValue({} as never)
})

function makeRequest(impressionId: string, event = 'impression') {
  return new NextRequest(
    `http://localhost/api/creators/ads/track?impressionId=${impressionId}&event=${event}`,
  )
}

describe('GET /api/creators/ads/track', () => {
  it('returns 200 for impression event and confirms impression', async () => {
    const res = await GET(makeRequest('imp_1', 'impression'))
    expect(res.status).toBe(200)
    expect(db.adImpression.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'confirmed' }) }),
    )
  })

  it('calculates earnings: floor(cpmCents / 1000 * revenueSharePct / 100)', async () => {
    // floor(5000 / 1000 * 70 / 100) = floor(5 * 0.7) = floor(3.5) = 3 cents
    const imp = { ...freshImpression, campaign: { cpmCents: 5000 } }
    vi.mocked(db.adImpression.findUnique).mockResolvedValue(imp as never)
    await GET(makeRequest('imp_1', 'impression'))
    expect(db.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 3 }),
      }),
    )
  })

  it('credits wallet with amountCents: 0 when floor rounds to zero (preserves ledger entry)', async () => {
    // floor(500 / 1000 * 70 / 100) = floor(0.5 * 0.7) = floor(0.35) = 0 cents
    // We always write the transaction record even at $0 — preserves the impression
    // audit trail and keeps ledger consistent. No guard on earningsCents > 0.
    const imp = { ...freshImpression, campaign: { cpmCents: 500 } }
    vi.mocked(db.adImpression.findUnique).mockResolvedValue(imp as never)
    await GET(makeRequest('imp_1', 'impression'))
    expect(db.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 0 }),
      }),
    )
  })

  it('returns 404 for unknown impressionId', async () => {
    vi.mocked(db.adImpression.findUnique).mockResolvedValue(null)
    const res = await GET(makeRequest('unknown'))
    expect(res.status).toBe(404)
  })

  it('returns 409 for already-confirmed impression', async () => {
    vi.mocked(db.adImpression.findUnique).mockResolvedValue(
      { ...freshImpression, status: 'confirmed' } as never,
    )
    const res = await GET(makeRequest('imp_1'))
    expect(res.status).toBe(409)
  })

  it('returns 410 for impression older than 10 minutes', async () => {
    vi.mocked(db.adImpression.findUnique).mockResolvedValue({
      ...freshImpression,
      createdAt: new Date(now.getTime() - 11 * 60_000),
    } as never)
    const res = await GET(makeRequest('imp_1'))
    expect(res.status).toBe(410)
  })

  it('returns 200 for complete/skip events without crediting wallet', async () => {
    const res = await GET(makeRequest('imp_1', 'complete'))
    expect(res.status).toBe(200)
    expect(db.walletTransaction.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/app/api/creators/ads/track/route.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/app/api/creators/ads/track/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const TEN_MINUTES_MS = 10 * 60 * 1000

export async function GET(req: NextRequest): Promise<NextResponse> {
  const impressionId = req.nextUrl.searchParams.get('impressionId')
  const event = req.nextUrl.searchParams.get('event') ?? 'impression'

  if (!impressionId) return NextResponse.json({ error: 'Missing impressionId' }, { status: 400 })

  // complete/skip events are acknowledged without billing or impression validation.
  // Known tradeoff: a malicious caller could fire complete/skip for any impressionId
  // (including non-existent ones). Acceptable because these events have no financial
  // impact — they exist only for future analytics. If analytics abuse becomes a
  // concern, add the same existence+status check as the 'impression' path.
  if (event === 'complete' || event === 'skip') {
    return NextResponse.json({ ok: true })
  }

  const impression = await db.adImpression.findUnique({
    where: { id: impressionId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      campaignId: true,
      videoId: true,
      campaign: { select: { cpmCents: true } },
      video: {
        select: {
          creatorId: true,
          creator: { select: { revenueSharePct: true } },
        },
      },
    },
  })

  if (!impression) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (impression.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 409 })

  const ageMs = Date.now() - impression.createdAt.getTime()
  if (ageMs > TEN_MINUTES_MS) return NextResponse.json({ error: 'Impression expired' }, { status: 410 })

  // earnings = floor((cpmCents / 1000) × revenueSharePct / 100)
  const earningsCents = Math.floor(
    (impression.campaign.cpmCents / 1000) * (impression.video.creator.revenueSharePct / 100),
  )

  await db.adImpression.update({
    where: { id: impressionId },
    data: { status: 'confirmed', earningsCents },
  })

  await db.walletTransaction.create({
    data: {
      creatorId: impression.video.creatorId,
      amountCents: earningsCents,
      type: 'earning',
      impressionId: impressionId,
    },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/app/api/creators/ads/track/route.test.ts
```
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/creators/ads/track/route.ts src/app/api/creators/ads/track/route.test.ts
git commit -m "feat: impression tracking — validate, confirm, credit wallet (TDD)"
```

---

### Task 9: Stripe webhook additions (TDD)

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`
- Modify: `src/app/api/stripe/webhook/route.test.ts`

- [ ] **Step 1: Add tests for transfer.paid and transfer.failed**

The existing test file uses `makeWebhookRequest(body: string)` (one argument — the Stripe signature is already in the helper's headers). The mock bypasses real signature verification.

**First, replace the existing `vi.mock('@/lib/db/client', ...)` block** (the one at the top of the file) with this merged version that adds `payoutRequest` and `walletTransaction`:

```typescript
vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: { findFirst: vi.fn(), update: vi.fn() },
    payoutRequest: { findFirst: vi.fn(), update: vi.fn() },
    walletTransaction: { create: vi.fn() },
  },
}))
```

Also add these two imports after the existing imports at the top of the test file:
```typescript
// (these are already imported — no change needed; just confirming)
import { db } from '@/lib/db/client'
import { constructStripeEvent } from '@/modules/creators/lib/stripe'
```

**Then add these two test cases** inside the existing `describe('POST /api/stripe/webhook', ...)` block (after the existing 4 tests):

```typescript
  it('marks PayoutRequest completed on transfer.paid', async () => {
    vi.mocked(constructStripeEvent).mockReturnValueOnce({
      type: 'transfer.paid',
      data: { object: { id: 'tr_abc123' } },
    } as never)
    vi.mocked(db.payoutRequest.findFirst).mockResolvedValueOnce({ id: 'pr_1', creatorId: 'creator_1', amountCents: 5000 } as never)

    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(200)
    expect(db.payoutRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    )
    expect(db.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: -5000, type: 'payout' }),
      }),
    )
  })

  it('marks PayoutRequest failed on transfer.failed', async () => {
    vi.mocked(constructStripeEvent).mockReturnValueOnce({
      type: 'transfer.failed',
      data: { object: { id: 'tr_abc123' } },
    } as never)
    vi.mocked(db.payoutRequest.findFirst).mockResolvedValueOnce({ id: 'pr_1', creatorId: 'creator_1', amountCents: 5000 } as never)

    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(200)
    expect(db.payoutRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) }),
    )
  })
```

- [ ] **Step 2: Run tests — verify new ones fail**

```bash
npx vitest run src/app/api/stripe/webhook/route.test.ts
```
Expected: 2 new FAIL, existing 4 still PASS

- [ ] **Step 3: Add transfer handlers to `src/app/api/stripe/webhook/route.ts`**

Add two new cases inside the switch block:

```typescript
    case 'transfer.paid': {
      const transfer = event.data.object as { id: string }
      const payout = await db.payoutRequest.findFirst({
        where: { stripeTransferId: transfer.id },
        select: { id: true, creatorId: true, amountCents: true },
      })
      if (payout) {
        await db.payoutRequest.update({
          where: { id: payout.id },
          data: { status: 'completed' },
        })
        await db.walletTransaction.create({
          data: {
            creatorId: payout.creatorId,
            amountCents: -payout.amountCents,
            type: 'payout',
            payoutRequestId: payout.id,
          },
        })
      }
      break
    }
    case 'transfer.failed': {
      const transfer = event.data.object as { id: string }
      const payout = await db.payoutRequest.findFirst({
        where: { stripeTransferId: transfer.id },
        select: { id: true },
      })
      if (payout) {
        await db.payoutRequest.update({
          where: { id: payout.id },
          data: { status: 'failed' },
        })
      }
      break
    }
```

- [ ] **Step 4: Run all webhook tests — verify 6 pass**

```bash
npx vitest run src/app/api/stripe/webhook/route.test.ts
```
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts src/app/api/stripe/webhook/route.test.ts
git commit -m "feat: Stripe webhook — transfer.paid completes payout, transfer.failed marks failed (TDD)"
```

---

### Task 10: publishVideo + requestPayout server actions (TDD)

**Files:**
- Create: `src/modules/creators/actions/publishVideo.ts`
- Create: `src/modules/creators/actions/publishVideo.test.ts`
- Create: `src/modules/creators/actions/requestPayout.ts`
- Create: `src/modules/creators/actions/requestPayout.test.ts`

- [ ] **Step 1: Write failing tests for publishVideo**

Create `src/modules/creators/actions/publishVideo.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { publishVideo } from './publishVideo'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: { findUnique: vi.fn() },
    creatorVideo: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user_1', email: 'a@b.com', role: 'user' } as never)
  vi.mocked(db.creatorProfile.findUnique).mockResolvedValue({ id: 'creator_1' } as never)
  vi.mocked(db.creatorVideo.findUnique).mockResolvedValue({
    id: 'vid_1',
    creatorId: 'creator_1',
    status: 'pending_review',
  } as never)
  vi.mocked(db.creatorVideo.update).mockResolvedValue({} as never)
})

describe('publishVideo', () => {
  it('sets status=live and tagsConfirmedAt', async () => {
    const result = await publishVideo({ videoId: 'vid_1' })
    expect(result.errors).toEqual({})
    expect(result.success).toBe(true)
    expect(db.creatorVideo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'live', tagsConfirmedAt: expect.any(Date) }),
      }),
    )
  })

  it('returns error if video not in pending_review state', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue({ id: 'vid_1', creatorId: 'creator_1', status: 'live' } as never)
    const result = await publishVideo({ videoId: 'vid_1' })
    expect(result.errors.general).toBeTruthy()
  })

  it('returns error if video belongs to different creator', async () => {
    vi.mocked(db.creatorVideo.findUnique).mockResolvedValue({ id: 'vid_1', creatorId: 'creator_other', status: 'pending_review' } as never)
    const result = await publishVideo({ videoId: 'vid_1' })
    expect(result.errors.general).toBeTruthy()
  })
})
```

- [ ] **Step 2: Write failing tests for requestPayout**

Create `src/modules/creators/actions/requestPayout.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestPayout } from './requestPayout'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: { findUnique: vi.fn() },
    payoutRequest: { findFirst: vi.fn(), create: vi.fn() },
  },
}))
vi.mock('@/modules/creators/lib/wallet', () => ({
  getWalletBalance: vi.fn(),
  hasPendingPayout: vi.fn(),
}))

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getWalletBalance, hasPendingPayout } from '@/modules/creators/lib/wallet'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user_1', email: 'a@b.com', role: 'user' } as never)
  vi.mocked(db.creatorProfile.findUnique).mockResolvedValue({ id: 'creator_1' } as never)
  vi.mocked(getWalletBalance).mockResolvedValue(10000)
  vi.mocked(hasPendingPayout).mockResolvedValue(false)
  vi.mocked(db.payoutRequest.create).mockResolvedValue({ id: 'pr_1' } as never)
})

describe('requestPayout', () => {
  it('creates PayoutRequest when balance sufficient', async () => {
    const result = await requestPayout({ amountCents: 5000 })
    expect(result.errors).toEqual({})
    expect(result.success).toBe(true)
    expect(db.payoutRequest.create).toHaveBeenCalled()
  })

  it('rejects payout below $50 minimum', async () => {
    const result = await requestPayout({ amountCents: 4999 })
    expect(result.errors.general).toContain('50')
  })

  it('rejects payout when balance insufficient', async () => {
    vi.mocked(getWalletBalance).mockResolvedValue(3000)
    const result = await requestPayout({ amountCents: 5000 })
    expect(result.errors.general).toBeTruthy()
  })

  it('rejects when pending payout already exists', async () => {
    vi.mocked(hasPendingPayout).mockResolvedValue(true)
    const result = await requestPayout({ amountCents: 5000 })
    expect(result.errors.general).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npx vitest run src/modules/creators/actions/publishVideo.test.ts src/modules/creators/actions/requestPayout.test.ts
```
Expected: FAIL

- [ ] **Step 4: Implement `publishVideo.ts`**

```typescript
'use server'

import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export type PublishVideoState = { errors: Record<string, string>; success?: boolean }

export async function publishVideo({ videoId }: { videoId: string }): Promise<PublishVideoState> {
  try {
    const user = await requireAuth()
    const creator = await db.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (!creator) return { errors: { general: 'Creator profile not found' } }

    const video = await db.creatorVideo.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true, status: true },
    })
    if (!video || video.creatorId !== creator.id) {
      return { errors: { general: 'Video not found' } }
    }
    if (video.status !== 'pending_review') {
      return { errors: { general: 'Video is not awaiting review' } }
    }

    await db.creatorVideo.update({
      where: { id: videoId },
      data: { status: 'live', tagsConfirmedAt: new Date() },
    })

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
```

- [ ] **Step 5: Implement `requestPayout.ts`**

```typescript
'use server'

import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { getWalletBalance, hasPendingPayout } from '@/modules/creators/lib/wallet'

const MINIMUM_PAYOUT_CENTS = 5000

export type RequestPayoutState = { errors: Record<string, string>; success?: boolean }

export async function requestPayout({ amountCents }: { amountCents: number }): Promise<RequestPayoutState> {
  try {
    const user = await requireAuth()
    const creator = await db.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (!creator) return { errors: { general: 'Creator profile not found' } }

    if (amountCents < MINIMUM_PAYOUT_CENTS) {
      return { errors: { general: 'Minimum payout is $50' } }
    }

    const balance = await getWalletBalance(creator.id)
    if (balance < amountCents) {
      return { errors: { general: 'Insufficient balance' } }
    }

    const pending = await hasPendingPayout(creator.id)
    if (pending) {
      return { errors: { general: 'A payout request is already pending' } }
    }

    await db.payoutRequest.create({
      data: { creatorId: creator.id, amountCents, status: 'pending' },
    })

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
npx vitest run src/modules/creators/actions/publishVideo.test.ts src/modules/creators/actions/requestPayout.test.ts
```
Expected: 7 passed

- [ ] **Step 7: Commit**

```bash
git add src/modules/creators/actions/publishVideo.ts src/modules/creators/actions/publishVideo.test.ts src/modules/creators/actions/requestPayout.ts src/modules/creators/actions/requestPayout.test.ts
git commit -m "feat: publishVideo + requestPayout server actions (TDD)"
```

---

### Task 11: YouTube RSS cron (TDD)

**Files:**
- Create: `src/app/api/cron/youtube-rss/route.ts`
- Create: `src/app/api/cron/youtube-rss/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/api/cron/youtube-rss/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: { findMany: vi.fn() },
    creatorVideo: { findMany: vi.fn() },
  },
}))
vi.mock('@/modules/creators/lib/youtube', () => ({
  parseRssFeed: vi.fn(),
}))
vi.mock('@/lib/pgboss', () => ({
  getBoss: vi.fn().mockResolvedValue({ send: vi.fn().mockResolvedValue('job-id') }),
}))

import { db } from '@/lib/db/client'
import { parseRssFeed } from '@/modules/creators/lib/youtube'
import { getBoss } from '@/lib/pgboss'

process.env.CRON_SECRET = 'test-secret'

function makeRequest() {
  return new NextRequest('http://localhost/api/cron/youtube-rss', {
    headers: { authorization: 'Bearer test-secret' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(db.creatorProfile.findMany).mockResolvedValue([
    { id: 'creator_1', youtubeChannelId: 'UCxxxxx' },
  ] as never)
  vi.mocked(db.creatorVideo.findMany).mockResolvedValue([])
  vi.mocked(parseRssFeed).mockResolvedValue(['video_new', 'video_existing'])
})

describe('GET /api/cron/youtube-rss', () => {
  it('returns 401 without valid cron secret', async () => {
    const res = await GET(new NextRequest('http://localhost/api/cron/youtube-rss'))
    expect(res.status).toBe(401)
  })

  it('enqueues new videos (skips existing)', async () => {
    vi.mocked(db.creatorVideo.findMany).mockResolvedValue([
      { youtubeVideoId: 'video_existing' },
    ] as never)
    const mockSend = vi.fn().mockResolvedValue('job-id')
    vi.mocked(getBoss).mockResolvedValue({ send: mockSend } as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith('video.ingest', expect.objectContaining({
      youtubeVideoId: 'video_new',
      source: 'rss',
    }))
  })

  it('skips creators without youtubeChannelId', async () => {
    vi.mocked(db.creatorProfile.findMany).mockResolvedValue([
      { id: 'creator_1', youtubeChannelId: null },
    ] as never)
    const mockSend = vi.fn()
    vi.mocked(getBoss).mockResolvedValue({ send: mockSend } as never)

    await GET(makeRequest())
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns ok response with enqueued count and timestamp', async () => {
    // No existing videos in DB → all 2 RSS IDs are new → enqueued = 2
    vi.mocked(db.creatorVideo.findMany).mockResolvedValue([])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.enqueued).toBe(2)
    expect(typeof body.timestamp).toBe('string')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/app/api/cron/youtube-rss/route.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `src/app/api/cron/youtube-rss/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { parseRssFeed } from '@/modules/creators/lib/youtube'
import { getBoss } from '@/lib/pgboss'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const creators = await db.creatorProfile.findMany({
    where: { status: 'active', youtubeChannelId: { not: null } },
    select: { id: true, youtubeChannelId: true },
  })

  let enqueued = 0

  for (const creator of creators) {
    if (!creator.youtubeChannelId) continue

    try {
      const rssVideoIds = await parseRssFeed(creator.youtubeChannelId)
      if (rssVideoIds.length === 0) continue

      const existing = await db.creatorVideo.findMany({
        where: { creatorId: creator.id, youtubeVideoId: { in: rssVideoIds } },
        select: { youtubeVideoId: true },
      })
      const existingIds = new Set(existing.map((v) => v.youtubeVideoId))
      const newIds = rssVideoIds.filter((id) => !existingIds.has(id))

      if (newIds.length === 0) continue

      const boss = await getBoss()
      for (const youtubeVideoId of newIds) {
        await boss.send('video.ingest', {
          youtubeVideoId,
          creatorId: creator.id,
          source: 'rss',
        })
        enqueued++
      }
    } catch (err) {
      console.error(`[youtube-rss] Failed for creator ${creator.id}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    enqueued,
    timestamp: new Date().toISOString(),
  })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/app/api/cron/youtube-rss/route.test.ts
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/youtube-rss/route.ts src/app/api/cron/youtube-rss/route.test.ts
git commit -m "feat: YouTube RSS cron — poll all active creator channels, enqueue new videos (TDD)"
```

---

## Chunk 3: UI + Admin + Verification

### Task 12: Creator dashboard — Videos tab

**Files:**
- Create: `src/modules/creators/components/VideoList.tsx`
- Create: `src/modules/creators/components/TagConfirmationForm.tsx`
- Modify: `src/modules/creators/lib/queries.ts` (add video query)

- [ ] **Step 1: Add video list query to `src/modules/creators/lib/queries.ts`**

Add after `getCreatorByUserId`:

```typescript
export async function getCreatorVideos(creatorProfileId: string) {
  return db.creatorVideo.findMany({
    where: { creatorId: creatorProfileId },
    include: {
      tags: true,
      _count: { select: { impressions: { where: { status: 'confirmed' } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}
```

- [ ] **Step 2: Create `src/modules/creators/components/VideoList.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { submitVideo } from '../actions/submitVideo'
import { TagConfirmationForm } from './TagConfirmationForm'

type VideoStatus = 'queued' | 'processing' | 'transcoding' | 'pending_review' | 'live' | 'rejected'

interface Video {
  id: string
  title: string
  thumbnailUrl: string | null
  status: VideoStatus
  viewCount: number
  createdAt: Date
  tags: Array<{ id: string; value: string; source: string; confirmed: boolean }>
  _count: { impressions: number }
}

interface VideoListProps {
  videos: Video[]
}

const STATUS_LABELS: Record<VideoStatus, { label: string; className: string }> = {
  queued:         { label: 'Queued',          className: 'bg-gray-500/10 text-gray-500' },
  processing:     { label: 'Processing',      className: 'bg-blue-500/10 text-blue-600' },
  transcoding:    { label: 'Transcoding',     className: 'bg-purple-500/10 text-purple-600' },
  pending_review: { label: 'Needs Review',    className: 'bg-yellow-500/10 text-yellow-600' },
  live:           { label: 'Live',            className: 'bg-green-500/10 text-green-600' },
  rejected:       { label: 'Rejected',        className: 'bg-red-500/10 text-red-600' },
}

type SubmitState = { errors: Record<string, string>; success?: boolean }
const initialState: SubmitState = { errors: {} }

export function VideoList({ videos }: VideoListProps) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitVideo as (s: SubmitState, f: FormData) => Promise<SubmitState>,
    initialState,
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Submit form */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Submit a Video</h3>
        <form action={formAction} className="flex gap-2">
          <input
            name="youtubeUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            required
            className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Submitting…' : 'Submit'}
          </button>
        </form>
        {state.errors.general && (
          <p className="mt-2 text-xs text-red-500">{state.errors.general}</p>
        )}
        {state.success && (
          <p className="mt-2 text-xs text-green-600">Video queued for processing!</p>
        )}
      </div>

      {/* Video list */}
      {videos.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-2 text-4xl">🎬</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            No videos yet. Submit a YouTube URL above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((video) => {
            const statusInfo = STATUS_LABELS[video.status]
            return (
              <div
                key={video.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="flex items-center gap-3 p-4">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-14 w-24 rounded object-cover"
                    />
                  ) : (
                    <div className="h-14 w-24 rounded bg-[var(--color-bg-secondary)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-text)]">
                      {video.title}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {video.viewCount.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                  {video.status === 'pending_review' && (
                    <button
                      onClick={() => setExpandedId(expandedId === video.id ? null : video.id)}
                      className="rounded bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-600 hover:bg-yellow-500/20"
                    >
                      Review Tags
                    </button>
                  )}
                  {video.status === 'live' && (
                    <a
                      href={`/creators/videos/${video.id}`}
                      className="rounded bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
                    >
                      View
                    </a>
                  )}
                </div>
                {expandedId === video.id && video.status === 'pending_review' && (
                  <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3">
                    <TagConfirmationForm videoId={video.id} tags={video.tags} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/modules/creators/components/TagConfirmationForm.tsx`**

```typescript
'use client'

import { useActionState } from 'react'
import { publishVideo } from '../actions/publishVideo'

type Tag = { id: string; value: string; source: string; confirmed: boolean }
type PublishState = { errors: Record<string, string>; success?: boolean }

export function TagConfirmationForm({ videoId, tags }: { videoId: string; tags: Tag[] }) {
  const [state, formAction, pending] = useActionState<PublishState, FormData>(
    async (_prev: PublishState, _fd: FormData) => publishVideo({ videoId }),
    { errors: {} },
  )

  if (state.success) {
    return <p className="text-sm font-medium text-green-600">Video is now live! 🎉</p>
  }

  return (
    <form action={formAction}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        AI-suggested tags — review and publish
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1 text-xs text-[var(--color-text)]"
          >
            {tag.value}
            {tag.source === 'ai' && (
              <span className="ml-1 text-[var(--color-text-muted)]">·AI</span>
            )}
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">No tags suggested yet.</span>
        )}
      </div>
      {state.errors.general && (
        <p className="mb-2 text-xs text-red-500">{state.errors.general}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Publishing…' : 'Confirm Tags & Publish'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Add submitVideo server action**

Create `src/modules/creators/actions/submitVideo.ts`:

```typescript
'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { getBoss } from '@/lib/pgboss'
import { extractYouTubeVideoId } from '@/modules/creators/lib/youtube'

const schema = z.object({
  youtubeUrl: z.string().url('Must be a valid URL'),
})

export type SubmitVideoState = { errors: Record<string, string>; success?: boolean }

export async function submitVideo(_prev: SubmitVideoState, formData: FormData): Promise<SubmitVideoState> {
  try {
    const user = await requireAuth()
    const raw = { youtubeUrl: formData.get('youtubeUrl') }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      return { errors: { youtubeUrl: parsed.error.issues[0]?.message ?? 'Invalid URL' } }
    }

    const videoId = extractYouTubeVideoId(parsed.data.youtubeUrl)
    if (!videoId) {
      return { errors: { general: 'Not a valid YouTube video URL' } }
    }

    const creator = await db.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    })
    if (!creator || creator.status !== 'active') {
      return { errors: { general: 'Creator account not active' } }
    }

    const existing = await db.creatorVideo.findUnique({
      where: { creatorId_youtubeVideoId: { creatorId: creator.id, youtubeVideoId: videoId } },
      select: { id: true },
    })
    if (existing) {
      return { errors: { general: 'This video has already been submitted' } }
    }

    await db.creatorVideo.create({
      data: { creatorId: creator.id, youtubeVideoId: videoId, title: `YouTube video ${videoId}`, status: 'queued' },
    })

    const boss = await getBoss()
    await boss.send('video.ingest', { youtubeVideoId: videoId, creatorId: creator.id, source: 'manual' })

    return { errors: {}, success: true }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/modules/creators/lib/queries.ts src/modules/creators/actions/submitVideo.ts src/modules/creators/components/VideoList.tsx src/modules/creators/components/TagConfirmationForm.tsx
git commit -m "feat: creator dashboard Videos tab — video list, submit form, tag confirmation"
```

---

### Task 13: Creator dashboard — Wallet tab

**Files:**
- Create: `src/modules/creators/components/WalletTab.tsx`
- Modify: `src/modules/creators/components/CreatorDashboard.tsx`
- Modify: `src/app/dashboard/creator/page.tsx`

- [ ] **Step 1: Create `src/modules/creators/components/WalletTab.tsx`**

```typescript
'use client'

import { useActionState } from 'react'
import { requestPayout } from '../actions/requestPayout'

interface Transaction {
  id: string
  amountCents: number
  type: string
  createdAt: Date
}

interface WalletTabProps {
  balanceCents: number
  transactions: Transaction[]
  hasPendingPayout: boolean
}

type PayoutState = { errors: Record<string, string>; success?: boolean }

export function WalletTab({ balanceCents, transactions, hasPendingPayout }: WalletTabProps) {
  const [state, formAction, pending] = useActionState<PayoutState, FormData>(
    async (_prev: PayoutState, _fd: FormData) =>
      requestPayout({ amountCents: 5000 }), // minimum payout
    { errors: {} },
  )

  const balanceDollars = (balanceCents / 100).toFixed(2)
  const canPayout = balanceCents >= 5000 && !hasPendingPayout

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Available Balance
        </p>
        <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">${balanceDollars}</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Minimum payout: $50.00</p>

        {hasPendingPayout && (
          <p className="mt-3 text-xs text-yellow-600">A payout request is pending processing.</p>
        )}

        {state.success && (
          <p className="mt-3 text-xs text-green-600">Payout requested! Admin will process within 3-5 business days.</p>
        )}

        {!hasPendingPayout && !state.success && (
          <form action={formAction} className="mt-4">
            <button
              type="submit"
              disabled={!canPayout || pending}
              className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {pending ? 'Requesting…' : 'Request Payout ($50 min)'}
            </button>
            {state.errors.general && (
              <p className="mt-2 text-xs text-red-500">{state.errors.general}</p>
            )}
          </form>
        )}
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No transactions yet.</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <div>
                  <span className="text-sm capitalize text-[var(--color-text)]">{tx.type}</span>
                  <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${tx.amountCents >= 0 ? 'text-green-600' : 'text-red-500'}`}
                >
                  {tx.amountCents >= 0 ? '+' : ''}${(tx.amountCents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `CreatorDashboard.tsx` to accept real data**

Replace the entire file:

```typescript
'use client'

import { useState } from 'react'
import { VideoList } from './VideoList'
import { WalletTab } from './WalletTab'

type Tab = 'videos' | 'analytics' | 'wallet' | 'settings'

interface Video {
  id: string
  title: string
  thumbnailUrl: string | null
  status: 'queued' | 'processing' | 'transcoding' | 'pending_review' | 'live' | 'rejected'
  viewCount: number
  createdAt: Date
  tags: Array<{ id: string; value: string; source: string; confirmed: boolean }>
  _count: { impressions: number }
}

interface Transaction {
  id: string
  amountCents: number
  type: string
  createdAt: Date
}

interface CreatorDashboardProps {
  displayName: string
  status: string
  stripeConnected: boolean
  videos: Video[]
  balanceCents: number
  transactions: Transaction[]
  hasPendingPayout: boolean
}

export function CreatorDashboard({
  displayName,
  status,
  stripeConnected,
  videos,
  balanceCents,
  transactions,
  hasPendingPayout,
}: CreatorDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('videos')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'videos', label: 'Videos' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      {status !== 'active' && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-700">
            Your creator account is pending activation.
            {!stripeConnected && (
              <> <a href="/creators/onboarding/stripe" className="underline">Complete your Stripe setup</a> to go live.</>
            )}
            {stripeConnected && ' Stripe has your details — activation usually takes a few hours.'}
          </p>
        </div>
      )}

      <div className="mb-6 border-b border-[var(--color-border)]">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'videos' && <VideoList videos={videos} />}

      {activeTab === 'analytics' && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-3 text-4xl">📊</p>
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Analytics coming soon</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Views and earnings charts will appear once your content has data.
          </p>
        </div>
      )}

      {activeTab === 'wallet' && (
        <WalletTab
          balanceCents={balanceCents}
          transactions={transactions}
          hasPendingPayout={hasPendingPayout}
        />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Display Name</p>
            <p className="mt-1 text-sm text-[var(--color-text)]">{displayName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Stripe Status</p>
            <p className="mt-1 text-sm">
              {stripeConnected
                ? <span className="text-green-600">Connected</span>
                : <a href="/creators/onboarding/stripe" className="text-[var(--color-primary)] underline">Connect Stripe account</a>}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Account Status</p>
            <p className="mt-1 text-sm capitalize text-[var(--color-text)]">{status}</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update `src/app/dashboard/creator/page.tsx`** to pass real data

```typescript
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getCreatorByUserId, getCreatorVideos } from '@/modules/creators/lib/queries'
import { getWalletBalance, getWalletTransactions, hasPendingPayout } from '@/modules/creators/lib/wallet'
import { CreatorDashboard } from '@/modules/creators'

export default async function CreatorDashboardPage() {
  const user = await requireAuth()
  const creator = await getCreatorByUserId(user.id)
  if (!creator) redirect('/creators/onboarding')

  const [videos, balanceCents, transactions, pendingPayout] = await Promise.all([
    getCreatorVideos(creator.id),
    getWalletBalance(creator.id),
    getWalletTransactions(creator.id),
    hasPendingPayout(creator.id),
  ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Creator Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{creator.displayName}</p>
      </div>
      <CreatorDashboard
        displayName={creator.displayName}
        status={creator.status}
        stripeConnected={!!creator.stripeAccountId}
        videos={videos}
        balanceCents={balanceCents}
        transactions={transactions}
        hasPendingPayout={pendingPayout}
      />
    </main>
  )
}
```

- [ ] **Step 4: Update barrel `src/modules/creators/index.ts`**

```typescript
export { AdminCreatorPanel } from './components/AdminCreatorPanel'
export { InviteButton } from './components/InviteButton'
export { CreatorDashboard } from './components/CreatorDashboard'
export { VideoList } from './components/VideoList'
export { WalletTab } from './components/WalletTab'
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/modules/creators/components/WalletTab.tsx src/modules/creators/components/CreatorDashboard.tsx src/app/dashboard/creator/page.tsx src/modules/creators/index.ts
git commit -m "feat: creator dashboard Wallet tab + wire real data to all tabs"
```

---

### Task 14: Video watch page

**Files:**
- Create: `src/app/creators/videos/[videoId]/page.tsx`

- [ ] **Step 1: Create video watch page**

```typescript
import { notFound } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { VideoPlayer } from '@/modules/creators/components/VideoPlayer'

interface Props {
  params: Promise<{ videoId: string }>
}

export default async function VideoWatchPage({ params }: Props) {
  const { videoId } = await params

  const video = await db.creatorVideo.findUnique({
    where: { id: videoId, status: 'live' },
    include: {
      creator: { select: { displayName: true } },
    },
  })
  if (!video) notFound()

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <VideoPlayer
        videoId={video.id}
        hlsUrl={video.bunnyHlsUrl ?? ''}
        title={video.title}
        creatorName={video.creator.displayName}
        thumbnailUrl={video.thumbnailUrl ?? undefined}
      />
      <div className="mt-4">
        <h1 className="text-xl font-bold text-[var(--color-text)]">{video.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">by {video.creator.displayName}</p>
        {video.description && (
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-text)]">{video.description}</p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create `src/modules/creators/components/VideoPlayer.tsx`**

This is a client component that uses video.js with a custom VAST pre-roll.

```typescript
'use client'

import { useEffect, useRef } from 'react'

interface VideoPlayerProps {
  videoId: string
  hlsUrl: string
  title: string
  creatorName: string
  thumbnailUrl?: string
}

export function VideoPlayer({ videoId, hlsUrl, title, thumbnailUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hlsUrl) return

    let player: import('video.js').VideoJsPlayer | null = null

    async function initPlayer() {
      const videojs = (await import('video.js')).default
      const vastClient = await import('vast-client')

      const el = videoRef.current
      if (!el) return

      player = videojs(el, {
        controls: true,
        fluid: true,
        poster: thumbnailUrl,
        sources: [{ src: hlsUrl, type: 'application/x-mpegURL' }],
      })

      // Fetch VAST before first play
      player.one('play', async () => {
        player?.pause()
        try {
          const vastUrl = `/api/creators/ads/vast?videoId=${videoId}`
          const client = new vastClient.VASTClient()
          const response = await client.get(vastUrl)
          const ad = response.ads?.[0]
          const creative = ad?.creatives?.[0] as { mediaFiles?: Array<{ fileURL: string }>; trackingEvents?: Record<string, string[]> } | undefined
          const mediaFile = creative?.mediaFiles?.[0]

          if (mediaFile?.fileURL) {
            // Show ad overlay
            const adVideo = document.createElement('video')
            adVideo.src = mediaFile.fileURL
            adVideo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:#000;z-index:10'
            adVideo.controls = false
            containerRef.current?.appendChild(adVideo)

            // Skip button after 5s
            const skipBtn = document.createElement('button')
            skipBtn.textContent = 'Skip Ad'
            skipBtn.style.cssText =
              'position:absolute;bottom:60px;right:12px;z-index:11;padding:6px 12px;background:rgba(0,0,0,0.7);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:4px;font-size:12px;cursor:pointer;display:none'
            containerRef.current?.appendChild(skipBtn)

            setTimeout(() => { skipBtn.style.display = 'block' }, 5000)

            const cleanupAd = () => {
              adVideo.remove()
              skipBtn.remove()
              player?.play()
            }

            adVideo.addEventListener('ended', cleanupAd)
            skipBtn.addEventListener('click', () => {
              // Fire skip tracking
              const skipUrl = creative?.trackingEvents?.skip?.[0]
              if (skipUrl) fetch(skipUrl).catch(() => {})
              cleanupAd()
            })

            // Fire impression — vast-client places <Impression> URLs on ad.impressionURLTemplates,
            // NOT in creative.trackingEvents (which only contains <TrackingEvents> children)
            const impressionUrl = ad?.impressionURLTemplates?.[0]?.url
            if (impressionUrl) fetch(impressionUrl).catch(() => {})

            adVideo.play().catch(() => { cleanupAd() })
            return
          }
        } catch {
          // No ad available — proceed to content
        }
        player?.play()
      })
    }

    initPlayer().catch(console.error)

    return () => { player?.dispose() }
  }, [hlsUrl, videoId, thumbnailUrl])

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16/9' }}>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered w-full"
        data-setup="{}"
      />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/creators/videos/ src/modules/creators/components/VideoPlayer.tsx
git commit -m "feat: video watch page with video.js player and VAST pre-roll"
```

---

### Task 15: Admin panels + connectChannel action

**Files:**
- Create: `src/modules/creators/components/AdminCampaignPanel.tsx`
- Create: `src/modules/creators/components/AdminPayoutsPanel.tsx`
- Create: `src/modules/creators/actions/connectChannel.ts`
- Create: `src/app/admin/creators/campaigns/page.tsx`
- Create: `src/app/admin/creators/payouts/page.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create `connectChannel.ts` server action**

```typescript
'use server'

import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { resolveChannelId, fetchChannelBackCatalog } from '@/modules/creators/lib/youtube'
import { getBoss } from '@/lib/pgboss'

export type ConnectChannelState = { errors: Record<string, string>; success?: boolean; channelId?: string }

export async function connectChannel(
  _prev: ConnectChannelState,
  formData: FormData,
): Promise<ConnectChannelState> {
  try {
    await requireAdmin()
    const creatorProfileId = formData.get('creatorProfileId')
    const youtubeChannelUrl = formData.get('youtubeChannelUrl')

    if (typeof creatorProfileId !== 'string' || typeof youtubeChannelUrl !== 'string') {
      return { errors: { general: 'Missing fields' } }
    }

    const channelId = await resolveChannelId(youtubeChannelUrl)
    if (!channelId) {
      return { errors: { youtubeChannelUrl: 'Could not resolve YouTube channel ID. Check the URL.' } }
    }

    await db.creatorProfile.update({
      where: { id: creatorProfileId },
      data: { youtubeChannelId: channelId },
    })

    // Enqueue back-catalog (up to 50 videos, staggered 30s apart)
    const videoIds = await fetchChannelBackCatalog(channelId, 50)
    const boss = await getBoss()
    for (let i = 0; i < videoIds.length; i++) {
      await boss.send(
        'video.ingest',
        { youtubeVideoId: videoIds[i], creatorId: creatorProfileId, source: 'backcatalog' },
        { startAfter: i * 30 }, // stagger by 30 seconds each
      )
    }

    return { errors: {}, success: true, channelId }
  } catch {
    return { errors: { general: 'Something went wrong' } }
  }
}
```

- [ ] **Step 2: Create `AdminCampaignPanel.tsx`**

```typescript
import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'

export async function AdminCampaignPanel() {
  await requireAdmin()
  const campaigns = await db.adCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      advertiserName: true,
      cpmCents: true,
      dailyImpressionCap: true,
      startDate: true,
      endDate: true,
      status: true,
      _count: { select: { impressions: { where: { status: 'confirmed' } } } },
    },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Ad Campaigns</h2>
        <a
          href="/admin/creators/campaigns/new"
          className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          New Campaign
        </a>
      </div>
      {campaigns.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No campaigns yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <tr>
                {['Advertiser', 'CPM', 'Daily Cap', 'Period', 'Status', 'Impressions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{c.advertiserName}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">${(c.cpmCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{c.dailyImpressionCap.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{c._count.impressions.toLocaleString()}</td>
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

- [ ] **Step 3: Create `AdminPayoutsPanel.tsx`**

```typescript
import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'

export async function AdminPayoutsPanel() {
  await requireAdmin()
  const payouts = await db.payoutRequest.findMany({
    where: { status: 'pending' },
    include: { creator: { include: { user: { select: { email: true, name: true } } } } },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-[var(--color-text)]">Pending Payouts</h2>
      {payouts.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No pending payout requests.</p>
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
              <div>
                <p className="font-medium text-[var(--color-text)]">{p.creator.displayName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{p.creator.user.email}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Requested {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[var(--color-text)]">
                  ${(p.amountCents / 100).toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Stripe: {p.creator.stripeAccountId ?? 'not connected'}
                </p>
                <p className="mt-2 text-xs text-yellow-600">
                  Trigger payout manually via Stripe Dashboard → Connect → Transfers
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create admin pages**

`src/app/admin/creators/campaigns/page.tsx`:
```typescript
import { AdminCampaignPanel } from '@/modules/creators/components/AdminCampaignPanel'
export default function CampaignsPage() { return <AdminCampaignPanel /> }
```

`src/app/admin/creators/payouts/page.tsx`:
```typescript
import { AdminPayoutsPanel } from '@/modules/creators/components/AdminPayoutsPanel'
export default function PayoutsPage() { return <AdminPayoutsPanel /> }
```

- [ ] **Step 5: Add nav links to `src/app/admin/layout.tsx`**

Add after the existing Creators link:
```tsx
<a href="/admin/creators/campaigns">Campaigns</a>
<a href="/admin/creators/payouts">Payouts</a>
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/modules/creators/actions/connectChannel.ts src/modules/creators/components/AdminCampaignPanel.tsx src/modules/creators/components/AdminPayoutsPanel.tsx src/app/admin/creators/campaigns/ src/app/admin/creators/payouts/ src/app/admin/layout.tsx
git commit -m "feat: admin campaign + payout panels, connectChannel action"
```

---

### Task 16: Full verification

**Files:** None created — verification only.

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass (131 existing + ~35 new = ~166 total)

- [ ] **Step 2: TypeScript clean**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Manual smoke test checklist**

With dev server running at `http://localhost:3001`:

- [ ] Visit `/admin/creators` — InviteButton renders, creator list shows
- [ ] Visit `/admin/creators/campaigns` — campaign table renders (empty is OK)
- [ ] Visit `/admin/creators/payouts` — "No pending payouts" message shows
- [ ] Visit `/dashboard/creator` — redirects to `/creators/onboarding` if no profile
- [ ] After creator onboarding: dashboard shows Videos tab with submit form
- [ ] After creator onboarding: Wallet tab shows $0.00 balance
- [ ] Submit a YouTube URL in the Videos tab — check for 201 response or "Video queued" message
- [ ] Visit `/api/creators/ads/vast?videoId=nonexistent` — returns `<VAST version="2.0"/>` empty XML
- [ ] Visit `/api/cron/youtube-rss` without auth header — returns 401

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Creator Video Pipeline Phase 2A — Next.js app complete

- pg-boss enqueue client
- YouTube lib: URL extraction, channel resolution, RSS parsing
- VAST 2.0 XML builder
- Video submission API + deduplication
- VAST ad endpoint: campaign selection, daily cap, impression creation
- Impression tracking: validate, confirm, credit wallet
- Stripe webhook: transfer.paid/failed for payout completion
- publishVideo + requestPayout server actions
- YouTube RSS cron
- Creator dashboard: Videos tab (real data), Wallet tab
- Video watch page with video.js + VAST pre-roll
- Admin campaign + payout panels"
```
