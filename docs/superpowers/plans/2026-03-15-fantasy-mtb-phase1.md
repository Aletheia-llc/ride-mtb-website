# Fantasy MTB Racing — Phase 1: Foundation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin backbone for Fantasy MTB Racing — schema, migrations, and `/admin/fantasy/` CRUD — so series, events, and riders can be managed before any user-facing gameplay exists.

**Architecture:** 20 new Prisma models + 6 enums added to the existing schema. Admin pages follow the existing pattern in `src/app/admin/`. No user-facing routes in this phase. Phase 2 builds on top.

**Tech Stack:** Prisma v7 (PrismaPg adapter), Next.js 15 server actions, Tailwind CSS v4, `db` from `@/lib/db/client`

**Spec:** `docs/superpowers/specs/2026-03-15-fantasy-mtb-design.md`

---

## File Structure

**Create:**
- `src/modules/fantasy/types/index.ts` — TS types
- `src/modules/fantasy/constants/scoring.ts` — points table + bonus values
- `src/modules/fantasy/actions/admin/manageSeries.ts` — createSeries, updateSeries
- `src/modules/fantasy/actions/admin/manageEvent.ts` — createEvent, updateEvent
- `src/modules/fantasy/actions/admin/manageRider.ts` — createRider, addRiderToEvent
- `src/modules/fantasy/actions/admin/publishExpertPick.ts` — publishExpertPick
- `src/app/admin/fantasy/page.tsx` — admin hub
- `src/app/admin/fantasy/series/page.tsx` — series list + create
- `src/app/admin/fantasy/series/[id]/page.tsx` — edit series
- `src/app/admin/fantasy/events/page.tsx` — events list
- `src/app/admin/fantasy/events/[id]/page.tsx` — create/edit event + rider entries
- `src/app/admin/fantasy/riders/page.tsx` — rider database
- `src/app/admin/fantasy/riders/[id]/page.tsx` — create/edit rider

**Modify:**
- `prisma/schema.prisma` — add 20 models + 6 enums + User relation fields
- `src/shared/types/xp.ts` — add `fantasy` to XpModule, 4 fantasy events to XpEvent
- `src/shared/constants/xp-values.ts` — add 4 fantasy XP values

---

## Chunk 1: Schema + Constants

### Task 1: Prisma schema additions

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enums**

Open `prisma/schema.prisma` and append these enums before the closing of the file (after the last existing enum):

```prisma
enum Discipline {
  dh
  ews
  xc

  @@map("Discipline")
}

enum SeriesStatus {
  upcoming
  active
  completed

  @@map("SeriesStatus")
}

enum EventStatus {
  upcoming
  roster_open
  locked
  results_pending
  scored

  @@map("EventStatus")
}

enum PassStatus {
  active
  refunded

  @@map("PassStatus")
}

enum Gender {
  male
  female

  @@map("Gender")
}

enum ResultStatus {
  pending
  scraped
  confirmed
  scored
  override_pending

  @@map("ResultStatus")
}
```

Also add to the existing `XpEvent` enum:
```prisma
  fantasy_team_scored
  fantasy_top_10_pct
  fantasy_season_completed
  fantasy_league_won
```

Also add to the existing `XpModule` enum:
```prisma
  fantasy
```

- [ ] **Step 2: Add User relation fields**

In the `model User` block, after the last existing relation field (before `@@map("users")`), add:

```prisma
  fantasyTeams            FantasyTeam[]
  fantasyLeaguesCreated   FantasyLeague[]          @relation("LeagueCreator")
  fantasyLeagueMemberships FantasyLeagueMember[]
  seasonPasses            SeasonPassPurchase[]
  mulliganBalance         MulliganBalance?
  mulliganUses            MulliganUse[]
```

- [ ] **Step 3: Add all 20 fantasy models**

Append after the existing models (before the enums section):

```prisma
// ============================================================
// FANTASY MTB RACING
// ============================================================

model FantasySeries {
  id                String          @id @default(cuid())
  name              String
  discipline        Discipline
  season            Int
  status            SeriesStatus    @default(upcoming)
  salaryCap         Int             @default(150000000)
  sensitivityFactor Float           @default(1.5)
  events            FantasyEvent[]
  teams             FantasyTeam[]
  passes            SeasonPassPurchase[]
  seasonScores      FantasySeasonScore[]
  leagues           FantasyLeague[]
  createdAt         DateTime        @default(now())

  @@unique([discipline, season])
  @@map("fantasy_series")
}

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
  series           FantasySeries     @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  riderEntries     RiderEventEntry[]
  picks            FantasyPick[]
  scores           FantasyEventScore[]
  results          RaceResult[]
  expertPicks      ExpertPick[]
  createdAt        DateTime          @default(now())

  @@index([seriesId, raceDate])
  @@map("fantasy_events")
}

model Rider {
  id           String            @id @default(cuid())
  name         String
  nationality  String
  photoUrl     String?
  uciId        String?           @unique
  gender       Gender
  disciplines  Discipline[]
  eventEntries RiderEventEntry[]
  results      RaceResult[]
  expertPicks  ExpertPick[]
  picks        FantasyPick[]
  createdAt    DateTime          @default(now())

  @@map("riders")
}

model RiderEventEntry {
  id                 String       @id @default(cuid())
  riderId            String
  eventId            String
  basePriceCents     Int
  marketPriceCents   Int
  ownershipPct       Float?
  finishPosition     Int?
  qualifyingPosition Int?
  fantasyPoints      Int?
  bonusPoints        Int?
  dnsDnf             Boolean      @default(false)
  partialCompletion  Boolean      @default(false)
  rider              Rider        @relation(fields: [riderId], references: [id], onDelete: Cascade)
  event              FantasyEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([riderId, eventId])
  @@index([eventId])
  @@map("rider_event_entries")
}

model FantasyTeam {
  id           String              @id @default(cuid())
  userId       String
  seriesId     String
  season       Int
  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  series       FantasySeries       @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  picks        FantasyPick[]
  eventScores  FantasyEventScore[]
  seasonScore  FantasySeasonScore?
  mulliganUses MulliganUse[]

  @@unique([userId, seriesId, season])
  @@map("fantasy_teams")
}

model FantasyPick {
  id          String       @id @default(cuid())
  teamId      String
  eventId     String
  riderId     String
  isWildcard  Boolean      @default(false)
  priceAtPick Int
  lockedAt    DateTime?
  team        FantasyTeam  @relation(fields: [teamId], references: [id], onDelete: Cascade)
  event       FantasyEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  rider       Rider        @relation(fields: [riderId], references: [id], onDelete: Cascade)

  @@unique([teamId, eventId, riderId])
  @@index([teamId, eventId])
  @@map("fantasy_picks")
}

model FantasyEventScore {
  id           String      @id @default(cuid())
  teamId       String
  eventId      String
  basePoints   Int         @default(0)
  bonusPoints  Int         @default(0)
  totalPoints  Int         @default(0)
  rank         Int?
  isDropRound  Boolean     @default(false)
  isOverBudget Boolean     @default(false)
  team         FantasyTeam  @relation(fields: [teamId], references: [id], onDelete: Cascade)
  event        FantasyEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([teamId, eventId])
  @@index([eventId, totalPoints])
  @@map("fantasy_event_scores")
}

model FantasySeasonScore {
  id              String        @id @default(cuid())
  teamId          String        @unique
  seriesId        String
  season          Int
  totalPoints     Int           @default(0)
  eventsPlayed    Int           @default(0)
  bestEventScore  Int?
  worstEventScore Int?
  rank            Int?
  team            FantasyTeam   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  series          FantasySeries @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  @@index([seriesId, season, totalPoints])
  @@map("fantasy_season_scores")
}

model FantasyLeague {
  id              String              @id @default(cuid())
  name            String
  avatarUrl       String?
  seriesId        String
  season          Int
  createdByUserId String
  inviteCode      String              @unique
  isPublic        Boolean             @default(true)
  isSurvivor      Boolean             @default(false)
  isChampionship  Boolean             @default(false)
  members         FantasyLeagueMember[]
  series          FantasySeries       @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  createdBy       User                @relation("LeagueCreator", fields: [createdByUserId], references: [id])
  createdAt       DateTime            @default(now())

  @@index([seriesId, season])
  @@map("fantasy_leagues")
}

model FantasyLeagueMember {
  id           String        @id @default(cuid())
  leagueId     String
  userId       String
  joinedAt     DateTime      @default(now())
  eliminatedAt DateTime?
  league       FantasyLeague @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([leagueId, userId])
  @@map("fantasy_league_members")
}

model SeasonPassPurchase {
  id              String        @id @default(cuid())
  userId          String
  seriesId        String
  season          Int
  stripeSessionId String        @unique
  status          PassStatus    @default(active)
  createdAt       DateTime      @default(now())
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  series          FantasySeries @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  @@unique([userId, seriesId, season])
  @@map("season_pass_purchases")
}

model MulliganBalance {
  id             String @id @default(cuid())
  userId         String @unique
  totalPurchased Int    @default(0)
  totalUsed      Int    @default(0)
  user           User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("mulligan_balances")
}

model MulliganUse {
  id      String      @id @default(cuid())
  userId  String
  teamId  String
  eventId String
  usedAt  DateTime    @default(now())
  user    User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  team    FantasyTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  event   FantasyEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([teamId, eventId])
  @@map("mulligan_uses")
}

model ExpertPick {
  id                String       @id @default(cuid())
  eventId           String
  riderId           String
  slot              Int
  publishedAt       DateTime?
  publishedByUserId String?
  event             FantasyEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  rider             Rider        @relation(fields: [riderId], references: [id], onDelete: Cascade)

  @@unique([eventId, slot])
  @@unique([eventId, riderId])
  @@map("expert_picks")
}

model RaceResult {
  id                 String         @id @default(cuid())
  eventId            String
  riderId            String
  status             ResultStatus   @default(pending)
  finishPosition     Int?
  qualifyingPosition Int?
  dnsDnf             Boolean        @default(false)
  partialCompletion  Boolean        @default(false)
  stageResults       Json?
  rawHtmlUrl         String?
  scrapedAt          DateTime?
  confirmedAt        DateTime?
  confirmedByUserId  String?
  overrides          ResultOverride[]
  event              FantasyEvent   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  rider              Rider          @relation(fields: [riderId], references: [id], onDelete: Cascade)

  @@unique([eventId, riderId])
  @@map("race_results")
}

model ResultOverride {
  id                 String     @id @default(cuid())
  raceResultId       String
  previousPosition   Int?
  newPosition        Int?
  previousDnsDnf     Boolean
  newDnsDnf          Boolean
  reason             String
  overriddenByUserId String
  createdAt          DateTime   @default(now())
  raceResult         RaceResult @relation(fields: [raceResultId], references: [id], onDelete: Cascade)

  @@map("result_overrides")
}
```

- [ ] **Step 4: Push schema to database**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.` (may take ~30s)

- [ ] **Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` with new model types visible.

- [ ] **Step 6: Add championship league partial unique index**

The spec requires a partial unique index that Prisma can't express natively. Run:

```bash
node -e "
const fs = require('fs');
const raw = fs.readFileSync('.env.local', 'utf8');
const m = raw.match(/DATABASE_PASSWORD=([^\n]+)/);
const pw = m ? m[1].replace(/^\"|\"$/g, '').trim() : null;
const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-1-us-west-1.pooler.supabase.com',
  user: 'postgres.ulvnbvmtzzqruaaozhrr',
  password: pw, database: 'postgres', port: 5432,
  ssl: { rejectUnauthorized: false },
});
pool.query(\`
  CREATE UNIQUE INDEX IF NOT EXISTS fantasy_leagues_championship_unique
  ON fantasy_leagues (series_id, season)
  WHERE is_championship = true
\`).then(() => { console.log('Index created'); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
"
```

Expected: `Index created`

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(fantasy): add 20 Prisma models + 6 enums for Fantasy MTB Racing"
```

---

### Task 2: XP constants + types

**Files:**
- Modify: `src/shared/types/xp.ts`
- Modify: `src/shared/constants/xp-values.ts`

- [ ] **Step 1: Update XpModule type**

In `src/shared/types/xp.ts`, add `'fantasy'` to the `XpModule` union:

```typescript
export type XpModule = 'forum' | 'learn' | 'trails' | 'bikes' | 'events' | 'reviews' | 'rides' | 'marketplace' | 'merch' | 'shops' | 'media' | 'coaching' | 'fantasy'
```

Add 4 fantasy events to `XpEvent`:
```typescript
  | 'fantasy_team_scored'
  | 'fantasy_top_10_pct'
  | 'fantasy_season_completed'
  | 'fantasy_league_won'
```

- [ ] **Step 2: Add XP values**

In `src/shared/constants/xp-values.ts`, add to the `XP_VALUES` object:

```typescript
  fantasy_team_scored: 10,
  fantasy_top_10_pct: 25,
  fantasy_season_completed: 50,
  fantasy_league_won: 100,
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/types/xp.ts src/shared/constants/xp-values.ts
git commit -m "feat(fantasy): add fantasy XP events and module"
```

---

### Task 3: Scoring constants + pure functions

**Files:**
- Create: `src/modules/fantasy/constants/scoring.ts`
- Create: `src/modules/fantasy/lib/scoring.ts`
- Create: `src/modules/fantasy/lib/scoring.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/modules/fantasy/lib/scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  getBasePoints,
  getBonusPoints,
  computeTeamTotal,
} from './scoring'

describe('getBasePoints', () => {
  it('returns 30 for 1st place', () => {
    expect(getBasePoints({ finishPosition: 1, dnsDnf: false, partialCompletion: false })).toBe(30)
  })
  it('returns 1 for 20th place', () => {
    expect(getBasePoints({ finishPosition: 20, dnsDnf: false, partialCompletion: false })).toBe(1)
  })
  it('returns 0 for 21st+', () => {
    expect(getBasePoints({ finishPosition: 21, dnsDnf: false, partialCompletion: false })).toBe(0)
  })
  it('returns -2 for DNS/DNF', () => {
    expect(getBasePoints({ finishPosition: null, dnsDnf: true, partialCompletion: false })).toBe(-2)
  })
  it('returns 0 for EWS partial completion (no penalty)', () => {
    expect(getBasePoints({ finishPosition: null, dnsDnf: false, partialCompletion: true })).toBe(0)
  })
})

describe('getBonusPoints', () => {
  it('adds +5 for fastest qualifier (DH/XC)', () => {
    const r = getBonusPoints({ isFastestQualifier: true, stageWins: 0, homePodium: false })
    expect(r).toBe(5)
  })
  it('adds +3 per EWS stage win', () => {
    expect(getBonusPoints({ isFastestQualifier: false, stageWins: 3, homePodium: false })).toBe(9)
  })
  it('adds +3 for home-country podium', () => {
    expect(getBonusPoints({ isFastestQualifier: false, stageWins: 0, homePodium: true })).toBe(3)
  })
  it('stacks bonuses', () => {
    expect(getBonusPoints({ isFastestQualifier: true, stageWins: 2, homePodium: true })).toBe(14)
  })
})

describe('computeTeamTotal', () => {
  it('adds wildcard top-10 bonus (+5 per qualifying wildcard)', () => {
    const picks = [
      { isWildcard: true, finishPosition: 5, dnsDnf: false, basePoints: 22, bonusPoints: 0 },
      { isWildcard: false, finishPosition: 3, dnsDnf: false, basePoints: 26, bonusPoints: 0 },
    ]
    const total = computeTeamTotal({ picks, salaryCap: 150000000, totalCost: 100000000 })
    expect(total.wildcardBonus).toBe(5)
  })
  it('adds perfect round bonus (+10) when all 6 finish top 20', () => {
    const picks = Array.from({ length: 6 }, (_, i) => ({
      isWildcard: false, finishPosition: i + 1, dnsDnf: false, basePoints: 30 - i * 2, bonusPoints: 0,
    }))
    const total = computeTeamTotal({ picks, salaryCap: 150000000, totalCost: 100000000 })
    expect(total.perfectRoundBonus).toBe(10)
  })
  it('returns 0 total when over budget', () => {
    const picks = [{ isWildcard: false, finishPosition: 1, dnsDnf: false, basePoints: 30, bonusPoints: 0 }]
    const total = computeTeamTotal({ picks, salaryCap: 150000000, totalCost: 160000000 })
    expect(total.totalPoints).toBe(0)
    expect(total.isOverBudget).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/modules/fantasy/lib/scoring.test.ts
```

Expected: FAIL — `Cannot find module './scoring'`

- [ ] **Step 3: Create scoring constants**

Create `src/modules/fantasy/constants/scoring.ts`:

```typescript
export const POSITION_POINTS: Record<number, number> = {
  1: 30, 2: 28, 3: 26, 4: 24, 5: 22,
  6: 20, 7: 18, 8: 16, 9: 14, 10: 12,
  11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
  16: 5, 17: 4, 18: 3, 19: 2, 20: 1,
}

export const DNS_DNF_POINTS = -2
export const FASTEST_QUALIFIER_BONUS = 5
export const STAGE_WIN_BONUS = 3
export const HOME_PODIUM_BONUS = 3
export const WILDCARD_TOP10_BONUS = 5
export const PERFECT_ROUND_BONUS = 10
export const WILDCARD_PRICE_THRESHOLD = 20_000_000 // $200K in cents
```

- [ ] **Step 4: Create scoring lib**

Create `src/modules/fantasy/lib/scoring.ts`:

```typescript
import {
  POSITION_POINTS,
  DNS_DNF_POINTS,
  FASTEST_QUALIFIER_BONUS,
  STAGE_WIN_BONUS,
  HOME_PODIUM_BONUS,
  WILDCARD_TOP10_BONUS,
  PERFECT_ROUND_BONUS,
} from '../constants/scoring'

export function getBasePoints(params: {
  finishPosition: number | null
  dnsDnf: boolean
  partialCompletion: boolean
}): number {
  if (params.dnsDnf) return DNS_DNF_POINTS
  if (params.partialCompletion) return 0
  if (!params.finishPosition) return 0
  return POSITION_POINTS[params.finishPosition] ?? 0
}

export function getBonusPoints(params: {
  isFastestQualifier: boolean
  stageWins: number
  homePodium: boolean
}): number {
  let bonus = 0
  if (params.isFastestQualifier) bonus += FASTEST_QUALIFIER_BONUS
  bonus += params.stageWins * STAGE_WIN_BONUS
  if (params.homePodium) bonus += HOME_PODIUM_BONUS
  return bonus
}

interface PickScore {
  isWildcard: boolean
  finishPosition: number | null
  dnsDnf: boolean
  basePoints: number
  bonusPoints: number
}

export function computeTeamTotal(params: {
  picks: PickScore[]
  salaryCap: number
  totalCost: number
}): {
  basePoints: number
  bonusPoints: number
  wildcardBonus: number
  perfectRoundBonus: number
  totalPoints: number
  isOverBudget: boolean
} {
  const isOverBudget = params.totalCost > params.salaryCap

  const basePoints = params.picks.reduce((s, p) => s + p.basePoints, 0)
  const bonusPoints = params.picks.reduce((s, p) => s + p.bonusPoints, 0)

  const wildcardBonus = params.picks
    .filter(p => p.isWildcard && p.finishPosition !== null && p.finishPosition <= 10 && !p.dnsDnf)
    .length * WILDCARD_TOP10_BONUS

  const allTop20 =
    params.picks.length === 6 &&
    params.picks.every(p => !p.dnsDnf && p.finishPosition !== null && p.finishPosition <= 20)
  const perfectRoundBonus = allTop20 ? PERFECT_ROUND_BONUS : 0

  const totalPoints = isOverBudget
    ? 0
    : basePoints + bonusPoints + wildcardBonus + perfectRoundBonus

  return { basePoints, bonusPoints, wildcardBonus, perfectRoundBonus, totalPoints, isOverBudget }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/modules/fantasy/lib/scoring.test.ts
```

Expected: PASS — 10/10 tests

- [ ] **Step 6: Commit**

```bash
git add src/modules/fantasy/
git commit -m "feat(fantasy): scoring constants and pure functions with tests"
```

---

## Chunk 2: Admin CRUD

### Task 4: TypeScript types

**Files:**
- Create: `src/modules/fantasy/types/index.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/modules/fantasy/types/index.ts
import type {
  FantasySeries, FantasyEvent, Rider, RiderEventEntry,
  FantasyTeam, FantasyPick, FantasyEventScore, FantasySeasonScore,
  FantasyLeague, FantasyLeagueMember, ExpertPick,
  Discipline, SeriesStatus, EventStatus, Gender,
} from '@/generated/prisma/client'

export type {
  FantasySeries, FantasyEvent, Rider, RiderEventEntry,
  FantasyTeam, FantasyPick, FantasyEventScore, FantasySeasonScore,
  FantasyLeague, FantasyLeagueMember, ExpertPick,
  Discipline, SeriesStatus, EventStatus, Gender,
}

export interface SeriesWithEvents extends FantasySeries {
  events: FantasyEvent[]
}

export interface EventWithEntries extends FantasyEvent {
  riderEntries: (RiderEventEntry & { rider: Rider })[]
}

export interface RiderWithEntries extends Rider {
  eventEntries: RiderEventEntry[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/fantasy/types/index.ts
git commit -m "feat(fantasy): TypeScript types barrel"
```

---

### Task 5: Admin series management

**Files:**
- Create: `src/modules/fantasy/actions/admin/manageSeries.ts`
- Create: `src/app/admin/fantasy/series/page.tsx`
- Create: `src/app/admin/fantasy/series/[id]/page.tsx`

- [ ] **Step 1: Create server actions**

```typescript
// src/modules/fantasy/actions/admin/manageSeries.ts
'use server'

import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Discipline, SeriesStatus } from '@/generated/prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'admin') throw new Error('Unauthorized')
}

export async function createSeries(data: {
  name: string
  discipline: Discipline
  season: number
  salaryCap?: number
  sensitivityFactor?: number
}) {
  await requireAdmin()
  const series = await db.fantasySeries.create({
    data: {
      name: data.name,
      discipline: data.discipline,
      season: data.season,
      salaryCap: data.salaryCap ?? 150_000_000,
      sensitivityFactor: data.sensitivityFactor ?? 1.5,
      status: 'upcoming',
    },
  })
  revalidatePath('/admin/fantasy/series')
  return series
}

export async function updateSeries(
  id: string,
  data: Partial<{ name: string; status: SeriesStatus; salaryCap: number; sensitivityFactor: number }>
) {
  await requireAdmin()
  const series = await db.fantasySeries.update({ where: { id }, data })
  revalidatePath('/admin/fantasy/series')
  revalidatePath(`/admin/fantasy/series/${id}`)
  return series
}
```

- [ ] **Step 2: Create series list page**

```tsx
// src/app/admin/fantasy/series/page.tsx
import { db } from '@/lib/db/client'
import Link from 'next/link'

export default async function AdminFantasySeriesPage() {
  const series = await db.fantasySeries.findMany({
    orderBy: [{ season: 'desc' }, { discipline: 'asc' }],
    include: { _count: { select: { events: true, teams: true } } },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fantasy Series</h1>
        <Link href="/admin/fantasy/series/new" className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium">
          + New Series
        </Link>
      </div>
      <div className="space-y-3">
        {series.map(s => (
          <div key={s.id} className="border border-[var(--color-border)] rounded-lg p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {s.discipline.toUpperCase()} · Season {s.season} · {s._count.events} events · {s._count.teams} teams
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                s.status === 'active' ? 'bg-green-100 text-green-700' :
                s.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                'bg-yellow-100 text-yellow-700'
              }`}>{s.status}</span>
            </div>
            <Link href={`/admin/fantasy/series/${s.id}`} className="text-sm text-blue-600 hover:underline">
              Edit
            </Link>
          </div>
        ))}
        {series.length === 0 && (
          <p className="text-[var(--color-text-muted)] text-sm">No series yet.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create series create/edit page**

```tsx
// src/app/admin/fantasy/series/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSeries, updateSeries } from '@/modules/fantasy/actions/admin/manageSeries'

// Note: for 'new' id, renders create form. For existing id, pre-populate from server component wrapper.
// For simplicity in Phase 1, this is a client form — no pre-population needed for create.
export default function SeriesFormPage({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new'
  const router = useRouter()
  const [name, setName] = useState('')
  const [discipline, setDiscipline] = useState<'dh' | 'ews' | 'xc'>('dh')
  const [season, setSeason] = useState(new Date().getFullYear())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createSeries({ name, discipline, season })
      router.push('/admin/fantasy/series')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isNew ? 'New Series' : 'Edit Series'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Series Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)]"
            placeholder="e.g. UCI DH World Cup 2026" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Discipline</label>
          <select value={discipline} onChange={e => setDiscipline(e.target.value as 'dh' | 'ews' | 'xc')}
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)]">
            <option value="dh">UCI DH World Cup</option>
            <option value="ews">Enduro World Series</option>
            <option value="xc">UCI XC World Cup</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Season (Year)</label>
          <input type="number" value={season} onChange={e => setSeason(Number(e.target.value))} required
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)]" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={saving}
          className="w-full bg-green-600 text-white py-2 rounded font-medium disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Series'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/fantasy/actions/admin/manageSeries.ts src/app/admin/fantasy/series/
git commit -m "feat(fantasy): admin series management"
```

---

### Task 6: Admin event management

**Files:**
- Create: `src/modules/fantasy/actions/admin/manageEvent.ts`
- Create: `src/app/admin/fantasy/events/page.tsx`
- Create: `src/app/admin/fantasy/events/[id]/page.tsx`

- [ ] **Step 1: Create event server actions**

```typescript
// src/modules/fantasy/actions/admin/manageEvent.ts
'use server'

import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'admin') throw new Error('Unauthorized')
}

export async function createEvent(data: {
  seriesId: string
  name: string
  location: string
  country: string
  raceDate: Date
  rosterDeadline: Date
  scraperUrl: string
  scraperUrlStages?: string
}) {
  await requireAdmin()
  const event = await db.fantasyEvent.create({ data: { ...data, status: 'upcoming' } })
  revalidatePath('/admin/fantasy/events')
  return event
}

export async function updateEventStatus(id: string, status: 'upcoming' | 'roster_open' | 'locked' | 'results_pending' | 'scored') {
  await requireAdmin()
  const event = await db.fantasyEvent.update({ where: { id }, data: { status } })
  revalidatePath('/admin/fantasy/events')
  return event
}

export async function addRiderToEvent(data: {
  riderId: string
  eventId: string
  basePriceCents: number
}) {
  await requireAdmin()
  const entry = await db.riderEventEntry.upsert({
    where: { riderId_eventId: { riderId: data.riderId, eventId: data.eventId } },
    create: { ...data, marketPriceCents: data.basePriceCents },
    update: { basePriceCents: data.basePriceCents, marketPriceCents: data.basePriceCents },
  })
  revalidatePath(`/admin/fantasy/events/${data.eventId}`)
  return entry
}
```

- [ ] **Step 2: Create events list page**

```tsx
// src/app/admin/fantasy/events/page.tsx
import { db } from '@/lib/db/client'
import Link from 'next/link'

export default async function AdminFantasyEventsPage() {
  const events = await db.fantasyEvent.findMany({
    orderBy: { raceDate: 'desc' },
    include: {
      series: { select: { name: true, discipline: true } },
      _count: { select: { riderEntries: true, picks: true } },
    },
    take: 50,
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fantasy Events</h1>
        <Link href="/admin/fantasy/events/new" className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium">
          + New Event
        </Link>
      </div>
      <div className="space-y-3">
        {events.map(e => (
          <div key={e.id} className="border border-[var(--color-border)] rounded-lg p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{e.name}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {e.series.name} · {e.location}, {e.country} · Race: {new Date(e.raceDate).toLocaleDateString()}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {e._count.riderEntries} riders · {e._count.picks} picks · status: {e.status}
              </p>
            </div>
            <Link href={`/admin/fantasy/events/${e.id}`} className="text-sm text-blue-600 hover:underline">Manage</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create event manage page (rider entries)**

```tsx
// src/app/admin/fantasy/events/[id]/page.tsx
import { db } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { AddRiderToEventForm } from './AddRiderToEventForm'

export default async function AdminEventPage({ params }: { params: { id: string } }) {
  if (params.id === 'new') {
    // TODO Phase 1: simple redirect to series create — minimal for now
    return <div className="p-6">Create event form — coming soon</div>
  }

  const event = await db.fantasyEvent.findUnique({
    where: { id: params.id },
    include: {
      series: true,
      riderEntries: {
        include: { rider: true },
        orderBy: { basePriceCents: 'desc' },
      },
    },
  })
  if (!event) notFound()

  const allRiders = await db.rider.findMany({
    where: { disciplines: { has: event.series.discipline } },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Race: {new Date(event.raceDate).toLocaleDateString()} · Deadline: {new Date(event.rosterDeadline).toLocaleDateString()} · Status: {event.status}
      </p>

      <AddRiderToEventForm eventId={event.id} riders={allRiders} />

      <h2 className="text-lg font-semibold mt-8 mb-3">Entered Riders ({event.riderEntries.length})</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left">
            <th className="py-2 pr-4">Rider</th>
            <th className="py-2 pr-4">Nationality</th>
            <th className="py-2 pr-4">Base Price</th>
            <th className="py-2">Market Price</th>
          </tr>
        </thead>
        <tbody>
          {event.riderEntries.map(entry => (
            <tr key={entry.id} className="border-b border-[var(--color-border)]">
              <td className="py-2 pr-4 font-medium">{entry.rider.name}</td>
              <td className="py-2 pr-4">{entry.rider.nationality}</td>
              <td className="py-2 pr-4">${(entry.basePriceCents / 100).toLocaleString()}</td>
              <td className="py-2">${(entry.marketPriceCents / 100).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

Create `src/app/admin/fantasy/events/[id]/AddRiderToEventForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { addRiderToEvent } from '@/modules/fantasy/actions/admin/manageEvent'
import type { Rider } from '@/generated/prisma/client'

export function AddRiderToEventForm({ eventId, riders }: { eventId: string; riders: Rider[] }) {
  const [riderId, setRiderId] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!riderId || !price) return
    setSaving(true)
    await addRiderToEvent({ riderId, eventId, basePriceCents: Math.round(parseFloat(price) * 100) })
    setSaving(false)
    setRiderId('')
    setPrice('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-1">Add Rider</label>
        <select value={riderId} onChange={e => setRiderId(e.target.value)}
          className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] text-sm">
          <option value="">Select rider...</option>
          {riders.map(r => <option key={r.id} value={r.id}>{r.name} ({r.nationality})</option>)}
        </select>
      </div>
      <div className="w-40">
        <label className="block text-sm font-medium mb-1">Base Price ($)</label>
        <input type="number" value={price} onChange={e => setPrice(e.target.value)}
          placeholder="300000" min="1"
          className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] text-sm" />
      </div>
      <button type="submit" disabled={saving || !riderId || !price}
        className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
        {saving ? 'Adding...' : 'Add'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/fantasy/actions/admin/manageEvent.ts src/app/admin/fantasy/events/
git commit -m "feat(fantasy): admin event management + rider entry"
```

---

### Task 7: Admin rider database

**Files:**
- Create: `src/modules/fantasy/actions/admin/manageRider.ts`
- Create: `src/app/admin/fantasy/riders/page.tsx`
- Create: `src/app/admin/fantasy/riders/[id]/page.tsx`

- [ ] **Step 1: Create rider server actions**

```typescript
// src/modules/fantasy/actions/admin/manageRider.ts
'use server'

import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { Discipline, Gender } from '@/generated/prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'admin') throw new Error('Unauthorized')
}

export async function createRider(data: {
  name: string
  nationality: string
  gender: Gender
  disciplines: Discipline[]
  uciId?: string
  photoUrl?: string
}) {
  await requireAdmin()
  const rider = await db.rider.create({ data })
  revalidatePath('/admin/fantasy/riders')
  return rider
}

export async function updateRider(id: string, data: Partial<{
  name: string; nationality: string; gender: Gender; disciplines: Discipline[]; uciId: string; photoUrl: string
}>) {
  await requireAdmin()
  const rider = await db.rider.update({ where: { id }, data })
  revalidatePath('/admin/fantasy/riders')
  revalidatePath(`/admin/fantasy/riders/${id}`)
  return rider
}
```

- [ ] **Step 2: Create riders list page**

```tsx
// src/app/admin/fantasy/riders/page.tsx
import { db } from '@/lib/db/client'
import Link from 'next/link'

export default async function AdminRidersPage() {
  const riders = await db.rider.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { eventEntries: true } } },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rider Database ({riders.length})</h1>
        <Link href="/admin/fantasy/riders/new" className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium">
          + New Rider
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Nationality</th>
            <th className="py-2 pr-4">Gender</th>
            <th className="py-2 pr-4">Disciplines</th>
            <th className="py-2 pr-4">Events</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {riders.map(r => (
            <tr key={r.id} className="border-b border-[var(--color-border)]">
              <td className="py-2 pr-4 font-medium">{r.name}</td>
              <td className="py-2 pr-4">{r.nationality}</td>
              <td className="py-2 pr-4">{r.gender}</td>
              <td className="py-2 pr-4">{r.disciplines.join(', ')}</td>
              <td className="py-2 pr-4">{r._count.eventEntries}</td>
              <td className="py-2">
                <Link href={`/admin/fantasy/riders/${r.id}`} className="text-blue-600 hover:underline">Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Create rider create/edit form page**

```tsx
// src/app/admin/fantasy/riders/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRider } from '@/modules/fantasy/actions/admin/manageRider'

export default function RiderFormPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [nationality, setNationality] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [disciplines, setDisciplines] = useState<('dh' | 'ews' | 'xc')[]>([])
  const [uciId, setUciId] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleDiscipline(d: 'dh' | 'ews' | 'xc') {
    setDisciplines(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await createRider({ name, nationality, gender, disciplines, uciId: uciId || undefined })
    router.push('/admin/fantasy/riders')
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Rider</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nationality (ISO code, e.g. US, GB, FR)</label>
          <input value={nationality} onChange={e => setNationality(e.target.value.toUpperCase())} required maxLength={3}
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)]" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female')}
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)]">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Disciplines</label>
          <div className="flex gap-4">
            {(['dh', 'ews', 'xc'] as const).map(d => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={disciplines.includes(d)} onChange={() => toggleDiscipline(d)} />
                {d.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">UCI ID (optional)</label>
          <input value={uciId} onChange={e => setUciId(e.target.value)}
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)]" />
        </div>
        <button type="submit" disabled={saving || !name || !nationality || disciplines.length === 0}
          className="w-full bg-green-600 text-white py-2 rounded font-medium disabled:opacity-50">
          {saving ? 'Saving...' : 'Create Rider'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/fantasy/actions/admin/manageRider.ts src/app/admin/fantasy/riders/
git commit -m "feat(fantasy): admin rider database CRUD"
```

---

### Task 8: Admin hub + expert picks

**Files:**
- Create: `src/app/admin/fantasy/page.tsx`
- Create: `src/modules/fantasy/actions/admin/publishExpertPick.ts`
- Create: `src/app/admin/fantasy/expert-picks/[eventId]/page.tsx`

- [ ] **Step 1: Create admin hub**

```tsx
// src/app/admin/fantasy/page.tsx
import Link from 'next/link'
import { db } from '@/lib/db/client'

export default async function AdminFantasyHub() {
  const [seriesCount, riderCount, openEvents] = await Promise.all([
    db.fantasySeries.count(),
    db.rider.count(),
    db.fantasyEvent.findMany({
      where: { status: { in: ['roster_open', 'results_pending'] } },
      include: { series: { select: { name: true } } },
      take: 5,
    }),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Fantasy MTB Admin</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Series', value: seriesCount, href: '/admin/fantasy/series' },
          { label: 'Riders', value: riderCount, href: '/admin/fantasy/riders' },
          { label: 'Active Events', value: openEvents.length, href: '/admin/fantasy/events' },
        ].map(stat => (
          <Link key={stat.label} href={stat.href}
            className="border border-[var(--color-border)] rounded-lg p-4 text-center hover:bg-[var(--color-bg-secondary)]">
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
          </Link>
        ))}
      </div>
      {openEvents.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Events Needing Attention</h2>
          <div className="space-y-2">
            {openEvents.map(e => (
              <div key={e.id} className="flex justify-between items-center border border-[var(--color-border)] rounded p-3 text-sm">
                <span>{e.name} <span className="text-[var(--color-text-muted)]">({e.series.name})</span></span>
                <span className="text-orange-600 font-medium">{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create publishExpertPick action**

```typescript
// src/modules/fantasy/actions/admin/publishExpertPick.ts
'use server'

import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'admin') throw new Error('Unauthorized')
  return session.user.id
}

export async function setExpertPick(data: { eventId: string; riderId: string; slot: number }) {
  const userId = await requireAdmin()
  await db.expertPick.upsert({
    where: { eventId_slot: { eventId: data.eventId, slot: data.slot } },
    create: { ...data, publishedAt: null, publishedByUserId: null },
    update: { riderId: data.riderId, publishedAt: null },
  })
  revalidatePath(`/admin/fantasy/expert-picks/${data.eventId}`)
}

export async function publishExpertPicks(eventId: string) {
  const userId = await requireAdmin()
  await db.expertPick.updateMany({
    where: { eventId, publishedAt: null },
    data: { publishedAt: new Date(), publishedByUserId: userId },
  })
  revalidatePath(`/admin/fantasy/expert-picks/${eventId}`)
}
```

- [ ] **Step 3: Create expert picks admin page**

```tsx
// src/app/admin/fantasy/expert-picks/[eventId]/page.tsx
import { db } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { ExpertPicksAdminForm } from './ExpertPicksAdminForm'

export default async function ExpertPicksAdminPage({ params }: { params: { eventId: string } }) {
  const event = await db.fantasyEvent.findUnique({
    where: { id: params.eventId },
    include: {
      series: true,
      expertPicks: { include: { rider: true }, orderBy: { slot: 'asc' } },
      riderEntries: { include: { rider: true }, orderBy: { basePriceCents: 'desc' } },
    },
  })
  if (!event) notFound()

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-2">Expert Picks — {event.name}</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        {event.expertPicks.filter(p => p.publishedAt).length > 0
          ? `Published at ${new Date(event.expertPicks.find(p => p.publishedAt)!.publishedAt!).toLocaleString()}`
          : 'Not yet published'}
      </p>
      <ExpertPicksAdminForm
        eventId={event.id}
        picks={event.expertPicks}
        riders={event.riderEntries.map(e => e.rider)}
      />
    </div>
  )
}
```

Create `src/app/admin/fantasy/expert-picks/[eventId]/ExpertPicksAdminForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { setExpertPick, publishExpertPicks } from '@/modules/fantasy/actions/admin/publishExpertPick'
import type { ExpertPick, Rider } from '@/generated/prisma/client'

export function ExpertPicksAdminForm({
  eventId, picks, riders,
}: {
  eventId: string
  picks: (ExpertPick & { rider: Rider })[]
  riders: Rider[]
}) {
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const currentBySlot = Object.fromEntries(picks.map(p => [p.slot, p.riderId]))

  async function handleSlotChange(slot: number, riderId: string) {
    setSaving(true)
    await setExpertPick({ eventId, riderId, slot })
    setSaving(false)
  }

  async function handlePublish() {
    setPublishing(true)
    await publishExpertPicks(eventId)
    setPublishing(false)
  }

  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5, 6].map(slot => (
        <div key={slot} className="flex items-center gap-4">
          <span className="w-16 text-sm font-medium">Slot {slot}</span>
          <select
            defaultValue={currentBySlot[slot] ?? ''}
            onChange={e => handleSlotChange(slot, e.target.value)}
            className="flex-1 border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] text-sm">
            <option value="">— Select rider —</option>
            {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      ))}
      <button
        onClick={handlePublish} disabled={publishing || picks.length < 6}
        className="mt-4 bg-green-600 text-white px-6 py-2 rounded font-medium disabled:opacity-50">
        {publishing ? 'Publishing...' : 'Publish All 6 Picks'}
      </button>
      {picks.length < 6 && (
        <p className="text-sm text-amber-600">Set all 6 slots before publishing.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/fantasy/ src/modules/fantasy/actions/admin/publishExpertPick.ts
git commit -m "feat(fantasy): admin hub + expert picks management"
```

---

## Chunk 3: Verification

### Task 9: Phase 1 verification

- [ ] **Step 1: Build check**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx next build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors. If errors: fix before continuing.

- [ ] **Step 2: Verify schema in database**

```bash
node -e "
const fs = require('fs');
const raw = fs.readFileSync('.env.local', 'utf8');
const m = raw.match(/DATABASE_PASSWORD=([^\n]+)/);
const pw = m[1].replace(/^\"|\"$/g, '').trim();
const { Pool } = require('pg');
const pool = new Pool({ host: 'aws-1-us-west-1.pooler.supabase.com', user: 'postgres.ulvnbvmtzzqruaaozhrr', password: pw, database: 'postgres', port: 5432, ssl: { rejectUnauthorized: false } });
pool.query(\`SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'fantasy%' OR table_name IN ('riders','rider_event_entries','race_results','result_overrides','expert_picks','mulligan_balances','mulligan_uses','season_pass_purchases') ORDER BY table_name\`).then(r => { console.log('Tables:', r.rows.map(x => x.table_name).join(', ')); pool.end(); });
"
```

Expected: Lists all 20 new fantasy-related tables.

- [ ] **Step 3: Run scoring tests**

```bash
npx vitest run src/modules/fantasy/lib/scoring.test.ts
```

Expected: 10/10 PASS

- [ ] **Step 4: Smoke test admin pages**

```bash
npx next dev &
sleep 5
curl -s http://localhost:3000/admin/fantasy | grep -c "Fantasy MTB Admin" && echo "hub OK"
```

Expected: `1` then `hub OK`

- [ ] **Step 5: Kill dev server + final commit**

```bash
kill %1
git log --oneline -8
```

Expected: See all Phase 1 commits in order.

---

**Phase 1 complete. Delivers:** Full admin backbone — series, events, rider database, expert picks. Zero user-facing pages. All 20 schema models live in Supabase. Scoring pure functions tested.

**Next:** Phase 2 plan: `docs/superpowers/plans/2026-03-15-fantasy-mtb-phase2.md`
