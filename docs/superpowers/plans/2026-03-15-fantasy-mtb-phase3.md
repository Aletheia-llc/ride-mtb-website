# Fantasy MTB Racing — Phase 3: Prediction Market

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the prediction market — prices move in real-time as users pick/drop riders, polling UI shows live price trends with up/down arrows, and roster-lock triggers a forum post with ownership breakdown.

**Prerequisite:** Phase 2 plan complete (`docs/superpowers/plans/2026-03-15-fantasy-mtb-phase2.md`)

**Architecture:** Redis (Upstash) caches price snapshots per event as JSON at key `fantasy:prices:{eventId}`. Two pg-boss workers (`pricesRecalculate`, `pricesReveal`) handle price computation and ownership finalization. A polling endpoint reads Redis (Postgres fallback). A `useLivePrices` client hook polls every 15s. `RiderList` displays price trend arrows. `TeamSelectionClient` wires it all together.

**Tech Stack:** Next.js 15, `@upstash/redis` v1.36.3, pg-boss jobs, Prisma v7 + raw SQL, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-15-fantasy-mtb-design.md` — sections: Prediction Market, Live Pricing, Ownership Reveal

**Schema note:** `FantasyEvent.forumThreadId` does not yet exist. Task 1 adds it via migration.

---

## File Structure

**Create:**
- `src/lib/redis.ts` — Redis client singleton
- `src/modules/fantasy/worker/pricesRecalculate.ts` — pg-boss handler: compute + write prices to Redis + Postgres
- `src/modules/fantasy/worker/pricesReveal.ts` — pg-boss handler: finalize ownershipPct + optional forum post
- `src/app/api/fantasy/prices/[eventId]/route.ts` — GET polling endpoint (Redis → Postgres fallback)
- `src/modules/fantasy/hooks/useLivePrices.ts` — client polling hook

**Modify:**
- `prisma/schema.prisma` — add `forumThreadId String?` to `FantasyEvent`
- `src/lib/env.ts` — add `FANTASY_BOT_USER_ID` optional env var
- `src/ui/components/fantasy/RiderList.tsx` — add `livePrices` prop + trend arrows
- `src/app/fantasy/[series]/team/TeamSelectionClient.tsx` — wire `useLivePrices` + live badge

---

## Chunk 1: Schema + Redis + Workers

### Task 1: Add forumThreadId to schema + migrate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add field to FantasyEvent model**

In `prisma/schema.prisma`, inside `model FantasyEvent`, add `forumThreadId String?` after `scraperUrlStages String?`. The updated block should look like:

```prisma
model FantasyEvent {
  id               String            @id @default(cuid())
  seriesId         String
  name             String
  location         String
  country          String
  raceDate         DateTime
  rosterDeadline   DateTime
  status           EventStatus       @default(upcoming)
  scraperUrl       String
  scraperUrlStages String?
  forumThreadId    String?
  series           FantasySeries     @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  riderEntries     RiderEventEntry[]
  picks            FantasyPick[]
  scores           FantasyEventScore[]
  results          RaceResult[]
  expertPicks      ExpertPick[]
  mulliganUses     MulliganUse[]
  createdAt        DateTime          @default(now())

  @@index([seriesId, raceDate])
  @@map("fantasy_events")
}
```

- [ ] **Step 2: Push schema to DB**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx prisma db push
```

Expected: `fantasy_events` table gains `forumThreadId` column. Prisma client regenerated.

- [ ] **Step 3: Verify**

```bash
npx prisma generate
```

Expected: No errors.

- [ ] **Step 4: Add FANTASY_BOT_USER_ID to env.ts**

In `src/lib/env.ts`, add to the optional section:

```typescript
FANTASY_BOT_USER_ID: z.string().optional(),
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/env.ts
git commit -m "feat(fantasy): add forumThreadId to FantasyEvent, FANTASY_BOT_USER_ID env"
```

---

### Task 2: Redis client singleton

**Files:**
- Create: `src/lib/redis.ts`

- [ ] **Step 1: Create singleton**

```typescript
// src/lib/redis.ts
import 'server-only'
import { Redis } from '@upstash/redis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export const redis: Redis =
  globalForRedis.redis ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/redis.ts
git commit -m "feat(fantasy): Redis client singleton"
```

---

### Task 3: pricesRecalculate worker

**Files:**
- Create: `src/modules/fantasy/worker/pricesRecalculate.ts`

- [ ] **Step 1: Implement worker**

```typescript
// src/modules/fantasy/worker/pricesRecalculate.ts
import { pool } from '@/lib/db/client'
import { redis } from '@/lib/redis'
import { computeMarketPrice } from '../lib/pricing'

export type PriceSnapshot = Record<string, { cents: number; prev: number | null }>

export async function handlePricesRecalculate(payload: { eventId: string }) {
  const { eventId } = payload
  const client = await pool.connect()
  try {
    // 1. Load event + series metadata
    const eventRes = await client.query(
      `SELECT e.id, e."seriesId", s."sensitivityFactor", s.season
       FROM fantasy_events e
       JOIN fantasy_series s ON s.id = e."seriesId"
       WHERE e.id = $1`,
      [eventId]
    )
    if (eventRes.rows.length === 0) {
      console.error(`[fantasy.prices.recalculate] Event ${eventId} not found`)
      return
    }
    const { seriesId, sensitivityFactor, season } = eventRes.rows[0]

    // 2. Count total teams in this series+season
    const teamCountRes = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM fantasy_teams
       WHERE "seriesId" = $1 AND season = $2`,
      [seriesId, season]
    )
    const teamCount: number = teamCountRes.rows[0].count

    // 3. Load all rider entries for this event
    const entriesRes = await client.query(
      `SELECT "riderId", "basePriceCents"
       FROM rider_event_entries
       WHERE "eventId" = $1`,
      [eventId]
    )
    const entries: Array<{ riderId: string; basePriceCents: number }> = entriesRes.rows

    // 4. Count picks per rider for this event (all picks, locked or not)
    const picksRes = await client.query(
      `SELECT "riderId", COUNT(*)::int AS count
       FROM fantasy_picks
       WHERE "eventId" = $1
       GROUP BY "riderId"`,
      [eventId]
    )
    const picksMap: Record<string, number> = {}
    for (const row of picksRes.rows) {
      picksMap[row.riderId] = row.count
    }

    // 5. Read existing Redis snapshot to preserve prev prices
    const redisKey = `fantasy:prices:${eventId}`
    const existingRaw = await redis.get<string>(redisKey)
    let existing: PriceSnapshot = {}
    if (existingRaw) {
      try {
        existing = typeof existingRaw === 'string'
          ? JSON.parse(existingRaw)
          : existingRaw as PriceSnapshot
      } catch {
        existing = {}
      }
    }

    // 6. Compute new prices
    const newSnapshot: PriceSnapshot = {}
    const updates: Array<{ riderId: string; cents: number }> = []

    for (const entry of entries) {
      const teamsWithRider = picksMap[entry.riderId] ?? 0
      const cents = computeMarketPrice({
        basePriceCents: entry.basePriceCents,
        teamCount,
        teamsWithRider,
        sensitivityFactor,
      })
      const prev = existing[entry.riderId]?.cents ?? null
      newSnapshot[entry.riderId] = { cents, prev }
      updates.push({ riderId: entry.riderId, cents })
    }

    // 7. Write to Redis (no TTL — persists until next recalculate)
    await redis.set(redisKey, JSON.stringify(newSnapshot))

    // 8. Bulk update Postgres marketPriceCents
    for (const update of updates) {
      await client.query(
        `UPDATE rider_event_entries
         SET "marketPriceCents" = $1
         WHERE "eventId" = $2 AND "riderId" = $3`,
        [update.cents, eventId, update.riderId]
      )
    }

    console.log(
      `[fantasy.prices.recalculate] Event ${eventId}: updated ${updates.length} rider prices`
    )
  } finally {
    client.release()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/fantasy/worker/pricesRecalculate.ts
git commit -m "feat(fantasy): pricesRecalculate worker — ownership-based price updates to Redis + Postgres"
```

---

### Task 4: pricesReveal worker

**Files:**
- Create: `src/modules/fantasy/worker/pricesReveal.ts`

- [ ] **Step 1: Implement worker**

```typescript
// src/modules/fantasy/worker/pricesReveal.ts
import { pool } from '@/lib/db/client'
import { db } from '@/lib/db/client'

export async function handlePricesReveal(payload: { eventId: string }) {
  const { eventId } = payload
  const client = await pool.connect()
  try {
    // 1. Load event + series metadata (including forumThreadId)
    const eventRes = await client.query(
      `SELECT e.id, e."seriesId", e.name, e."forumThreadId", s.season
       FROM fantasy_events e
       JOIN fantasy_series s ON s.id = e."seriesId"
       WHERE e.id = $1`,
      [eventId]
    )
    if (eventRes.rows.length === 0) {
      console.error(`[fantasy.prices.reveal] Event ${eventId} not found`)
      return
    }
    const { seriesId, name: eventName, forumThreadId, season } = eventRes.rows[0]

    // 2. Count total teams
    const teamCountRes = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM fantasy_teams
       WHERE "seriesId" = $1 AND season = $2`,
      [seriesId, season]
    )
    const totalTeams: number = teamCountRes.rows[0].count

    // 3. Count picks per rider
    const picksRes = await client.query(
      `SELECT fp."riderId", COUNT(*)::int AS count, r.name AS "riderName"
       FROM fantasy_picks fp
       JOIN riders r ON r.id = fp."riderId"
       WHERE fp."eventId" = $1
       GROUP BY fp."riderId", r.name`,
      [eventId]
    )

    // 4. Update ownershipPct for each rider
    for (const row of picksRes.rows) {
      const ownershipPct = totalTeams > 0
        ? (row.count / totalTeams) * 100
        : 0
      await client.query(
        `UPDATE rider_event_entries
         SET "ownershipPct" = $1
         WHERE "eventId" = $2 AND "riderId" = $3`,
        [ownershipPct, eventId, row.riderId]
      )
    }

    // 5. Post forum ownership breakdown if configured
    const botUserId = process.env.FANTASY_BOT_USER_ID
    if (forumThreadId && botUserId) {
      const sorted = [...picksRes.rows].sort(
        (a: { count: number }, b: { count: number }) => b.count - a.count
      )

      const lines: string[] = [
        `**${eventName} — Roster Lock Ownership Breakdown**`,
        ``,
        `Total teams: **${totalTeams}**`,
        ``,
        `| Rider | Owned By | % |`,
        `|-------|----------|---|`,
      ]

      for (const row of sorted) {
        const pct = totalTeams > 0
          ? ((row.count / totalTeams) * 100).toFixed(1)
          : '0.0'
        lines.push(`| ${row.riderName} | ${row.count} teams | ${pct}% |`)
      }

      const content = lines.join('\n')

      try {
        await db.forumPost.create({
          data: {
            threadId: forumThreadId,
            authorId: botUserId,
            content,
          },
        })
        console.log(
          `[fantasy.prices.reveal] Posted ownership breakdown to thread ${forumThreadId}`
        )
      } catch (err) {
        // Non-fatal — ownership data is in Postgres regardless
        console.error('[fantasy.prices.reveal] Failed to post forum reply:', err)
      }
    }

    console.log(
      `[fantasy.prices.reveal] Event ${eventId}: ownership finalized for ${picksRes.rows.length} riders`
    )
  } finally {
    client.release()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/fantasy/worker/pricesReveal.ts
git commit -m "feat(fantasy): pricesReveal worker — finalize ownershipPct + optional forum post"
```

---

## Chunk 2: Polling Endpoint + UI

### Task 5: Price polling endpoint

**Files:**
- Create: `src/app/api/fantasy/prices/[eventId]/route.ts`

- [ ] **Step 1: Create route**

```typescript
// src/app/api/fantasy/prices/[eventId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { db } from '@/lib/db/client'
import type { PriceSnapshot } from '@/modules/fantasy/worker/pricesRecalculate'

interface RouteParams {
  params: Promise<{ eventId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params

  const redisKey = `fantasy:prices:${eventId}`

  // Attempt Redis read
  let prices: PriceSnapshot | null = null
  try {
    const raw = await redis.get<string>(redisKey)
    if (raw) {
      prices = typeof raw === 'string' ? JSON.parse(raw) : (raw as PriceSnapshot)
    }
  } catch (err) {
    console.warn(`[fantasy/prices] Redis read failed for ${eventId}:`, err)
  }

  // Postgres fallback
  if (!prices) {
    const entries = await db.riderEventEntry.findMany({
      where: { eventId },
      select: { riderId: true, marketPriceCents: true },
    })
    prices = {}
    for (const entry of entries) {
      prices[entry.riderId] = { cents: entry.marketPriceCents, prev: null }
    }
  }

  return NextResponse.json(
    { prices, ts: Date.now() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/fantasy/prices/
git commit -m "feat(fantasy): price polling endpoint — Redis read with Postgres fallback"
```

---

### Task 6: useLivePrices hook

**Files:**
- Create: `src/modules/fantasy/hooks/useLivePrices.ts`

- [ ] **Step 1: Create hook**

```typescript
// src/modules/fantasy/hooks/useLivePrices.ts
'use client'

import { useState, useEffect, useRef } from 'react'

export type LivePriceEntry = { cents: number; prev: number | null }
export type LivePrices = Record<string, LivePriceEntry>

export function useLivePrices(
  eventId: string,
  isLocked: boolean
): { prices: LivePrices; loading: boolean } {
  const [prices, setPrices] = useState<LivePrices>({})
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isLocked) {
      // Roster is locked — one final fetch then stop
      fetch(`/api/fantasy/prices/${eventId}`)
        .then(res => res.json())
        .then(data => { if (data?.prices) setPrices(data.prices) })
        .catch(() => {})
        .finally(() => setLoading(false))
      return
    }

    let cancelled = false

    async function fetchPrices() {
      try {
        const res = await fetch(`/api/fantasy/prices/${eventId}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data?.prices) setPrices(data.prices)
      } catch {
        // Silently ignore network errors — stale prices remain displayed
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPrices()
    intervalRef.current = setInterval(fetchPrices, 15_000)

    return () => {
      cancelled = true
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [eventId, isLocked])

  return { prices, loading }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/fantasy/hooks/useLivePrices.ts
git commit -m "feat(fantasy): useLivePrices hook — 15s polling with lock-aware stop"
```

---

### Task 7: RiderList price trend arrows

**Files:**
- Modify: `src/ui/components/fantasy/RiderList.tsx`

- [ ] **Step 1: Add livePrices prop + PriceTrend sub-component**

Replace the entire contents of `src/ui/components/fantasy/RiderList.tsx`:

```typescript
// src/ui/components/fantasy/RiderList.tsx
'use client'

import { useState } from 'react'
import { formatPrice } from '@/modules/fantasy/lib/pricing'
import type { LivePrices } from '@/modules/fantasy/hooks/useLivePrices'

interface RiderRow {
  riderId: string
  name: string
  nationality: string
  gender: 'male' | 'female'
  marketPriceCents: number
  isWildcardEligible: boolean
  fantasyPoints: number | null
  isOnTeam: boolean
}

function PriceTrend({ cents, prev }: { cents: number; prev: number | null }) {
  if (prev === null || cents === prev) {
    return <span style={{ color: 'var(--color-text-muted)' }}>—</span>
  }
  if (cents > prev) {
    return <span style={{ color: '#16a34a' }}>↑</span>
  }
  return <span style={{ color: '#dc2626' }}>↓</span>
}

export function RiderList({
  riders,
  onSelect,
  livePrices,
}: {
  riders: RiderRow[]
  onSelect: (riderId: string) => void
  livePrices?: LivePrices
}) {
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [wildcardOnly, setWildcardOnly] = useState(false)

  const filtered = riders.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (genderFilter !== 'all' && r.gender !== genderFilter) return false
    if (wildcardOnly && !r.isWildcardEligible) return false
    return true
  })

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="p-3 border-b border-[var(--color-border)] space-y-2">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search riders..."
          className="w-full border border-[var(--color-border)] rounded px-3 py-1.5 text-sm bg-[var(--color-bg)]"
        />
        <div className="flex gap-3 text-xs">
          <select value={genderFilter} onChange={e => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
            className="border border-[var(--color-border)] rounded px-2 py-1 bg-[var(--color-bg)]">
            <option value="all">All</option>
            <option value="male">Men</option>
            <option value="female">Women</option>
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={wildcardOnly} onChange={e => setWildcardOnly(e.target.checked)} />
            Wildcard only
          </label>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--color-bg-secondary)]">
            <tr className="text-xs text-[var(--color-text-muted)] text-left">
              <th className="py-2 px-3">Rider</th>
              <th className="py-2 px-3 text-right">Price</th>
              <th className="py-2 px-3 text-right hidden md:table-cell">Pts</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const live = livePrices?.[r.riderId]
              const displayCents = live?.cents ?? r.marketPriceCents
              const prevCents = live?.prev ?? null

              return (
                <tr key={r.riderId}
                  className={`border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] cursor-pointer ${r.isOnTeam ? 'opacity-50' : ''}`}
                  onClick={() => !r.isOnTeam && onSelect(r.riderId)}>
                  <td className="py-2 px-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {r.nationality}
                      {r.isWildcardEligible && <span className="ml-1 text-amber-600">⭐WC</span>}
                    </p>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs">
                    <span className="mr-1">
                      <PriceTrend cents={displayCents} prev={prevCents} />
                    </span>
                    {formatPrice(displayCents)}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--color-text-muted)] hidden md:table-cell">
                    {r.fantasyPoints ?? '—'}
                  </td>
                  <td className="py-2 px-3">
                    {r.isOnTeam
                      ? <span className="text-xs text-green-600">✓</span>
                      : <span className="text-xs text-blue-600">+</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/components/fantasy/RiderList.tsx
git commit -m "feat(fantasy): RiderList live price trend arrows (↑/↓/—)"
```

---

### Task 8: Wire live prices into TeamSelectionClient

**Files:**
- Modify: `src/app/fantasy/[series]/team/TeamSelectionClient.tsx`

- [ ] **Step 1: Rewrite with useLivePrices**

Replace the entire contents:

```typescript
// src/app/fantasy/[series]/team/TeamSelectionClient.tsx
'use client'

import { useState } from 'react'
import { TeamPanel } from '@/ui/components/fantasy/TeamPanel'
import { RiderList } from '@/ui/components/fantasy/RiderList'
import { RiderDetail } from '@/ui/components/fantasy/RiderDetail'
import { useLivePrices } from '@/modules/fantasy/hooks/useLivePrices'

interface Rider {
  riderId: string; name: string; nationality: string; gender: 'male' | 'female';
  marketPriceCents: number; basePriceCents: number; isWildcardEligible: boolean; fantasyPoints: number | null;
}

interface Pick {
  riderId: string; name: string; isWildcard: boolean; priceAtPick: number;
}

export function TeamSelectionClient({
  picks: initialPicks,
  riders,
  teamId,
  seriesId,
  season,
  eventId,
  salaryCap,
  deadline,
}: {
  picks: Pick[]; riders: Rider[]; teamId: string | null;
  seriesId: string; season: number; eventId: string; salaryCap: number; deadline: Date;
}) {
  const [picks, setPicks] = useState(initialPicks)
  const [selected, setSelected] = useState<string | null>(null)

  const isLocked = new Date() >= deadline
  const { prices: livePrices, loading: pricesLoading } = useLivePrices(eventId, isLocked)

  const selectedRider = riders.find(r => r.riderId === selected)
  const totalCost = picks.reduce((s, p) => s + p.priceAtPick, 0)
  const teamRiderIds = new Set(picks.map(p => p.riderId))

  const showLiveBadge = !isLocked && !pricesLoading

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
      <TeamPanel
        picks={picks}
        totalCost={totalCost}
        salaryCap={salaryCap}
        teamId={teamId}
        eventId={eventId}
        deadline={deadline}
        isLocked={isLocked}
        onDropped={riderId => setPicks(prev => prev.filter(p => p.riderId !== riderId))}
      />
      <div className="flex flex-col gap-2">
        {showLiveBadge && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium w-fit">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live pricing
          </div>
        )}
        <RiderList
          riders={riders.map(r => ({ ...r, isOnTeam: teamRiderIds.has(r.riderId) }))}
          onSelect={setSelected}
          livePrices={Object.keys(livePrices).length > 0 ? livePrices : undefined}
        />
      </div>
      {selectedRider ? (
        <RiderDetail
          {...selectedRider}
          seriesId={seriesId}
          season={season}
          eventId={eventId}
          isOnTeam={teamRiderIds.has(selectedRider.riderId)}
          onPicked={() => {
            const live = livePrices[selectedRider.riderId]
            const priceAtPick = live?.cents ?? selectedRider.marketPriceCents
            setPicks(prev => [...prev, {
              riderId: selectedRider.riderId,
              name: selectedRider.name,
              isWildcard: selectedRider.isWildcardEligible,
              priceAtPick,
            }])
            setSelected(null)
          }}
        />
      ) : (
        <div className="border border-dashed border-[var(--color-border)] rounded-xl p-6 flex items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">Click a rider to see details</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/fantasy/[series]/team/TeamSelectionClient.tsx
git commit -m "feat(fantasy): wire live prices + trend arrows into team selection UI"
```

---

## Chunk 3: Verification

### Task 9: Build check + smoke tests

- [ ] **Step 1: Run existing fantasy tests**

```bash
npx vitest run src/modules/fantasy/
```

Expected: All pass (pricing + scoring = 17 tests).

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors. Fix any before proceeding.

- [ ] **Step 3: Next.js build**

```bash
npx next build 2>&1 | tail -20
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Verify Prisma schema**

```bash
npx prisma migrate status
```

Expected: All migrations applied.

- [ ] **Step 5: Check new files present**

```bash
find src/modules/fantasy/worker src/modules/fantasy/hooks src/app/api/fantasy src/lib/redis.ts -type f | sort
```

Expected output includes:
- `src/lib/redis.ts`
- `src/modules/fantasy/hooks/useLivePrices.ts`
- `src/modules/fantasy/worker/pricesRecalculate.ts`
- `src/modules/fantasy/worker/pricesReveal.ts`
- `src/app/api/fantasy/prices/[eventId]/route.ts`

- [ ] **Step 6: Final commit log check**

```bash
git log --oneline feature/fantasy-phase3 ^main | head -15
```

All Phase 3 commits should be present.

---

**Phase 3 complete. Delivers:** Real-time prediction market — ownership-based prices update after every pick/drop via Fly.io worker + Redis, polling UI shows live trend arrows, roster-lock triggers ownership reveal to Postgres + optional forum post.

**Data flow:**
```
pick/drop → pricesRecalculate job → Redis update → 15s poll → trend arrows in UI
lock-rosters cron → pricesReveal job → ownershipPct in Postgres → forum post
```

**Next:** Phase 4 — Season Passes + Mulligans (Stripe Checkout for season pass ($29.99), mulligan packs ($5/$10), mulligan auto-pick, Championship League auto-join)
