# Bikes Garage Group A Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 features to the monolith bike garage (stats, compare, export/import, weight breakdown, cost summary, duplicate, share) without schema changes.

**Architecture:** New queries and server actions live in the existing `src/modules/bikes/` module. UI components are client-side where they need interactivity. The bike detail page overview tab gains three new card sections and two new action buttons. The garage index gains a stats nav link and compare mode.

**Tech Stack:** Next.js 15.5.12 App Router, Prisma v7 (Supabase), Tailwind CSS v4, Vitest + RTL, `@/generated/prisma/client` for enum types

**Spec:** `docs/superpowers/specs/2026-03-18-bikes-garage-group-a-design.md`

---

## Key Schema Facts

- `UserBike.weight: Float?` — stored in **lbs**
- `UserBike.purchasePrice: Int?` — **whole dollars**
- `BikeComponent.weightGrams: Int?` — grams
- `BikeComponent.priceCents: Int?` — cents (display: `priceCents / 100`)
- `BikeComponent.notes: String?` (not `specs`)
- `BikeCategory` enum: `gravel | xc | trail | enduro | downhill | dirt_jump | ebike | other` (lowercase)
- `BikeComponentCategory` enum: `FRAME | FORK | SHOCK | WHEELS | DRIVETRAIN | BRAKES | COCKPIT | SEATPOST | SADDLE | PEDALS | OTHER` (uppercase)
- Pre-existing test failure: `addComponent.test.ts` "adds a component successfully" — caused by unmocked `revalidatePath`. Not caused by this work; do not fix.
- Working directory: `/Users/kylewarner/Documents/ride-mtb/.worktrees/bikes-garage-group-a`
- Run tests: `npx vitest run --reporter=verbose`

---

## File Structure

```
NEW
  src/modules/bikes/lib/garage-queries.test.ts       — unit tests for new queries
  src/modules/bikes/actions/garage-actions.ts        — duplicateBike, exportBike, importBike
  src/modules/bikes/actions/garage-actions.test.ts   — unit tests for actions
  src/modules/bikes/components/garage/WeightBreakdown.tsx
  src/modules/bikes/components/garage/CostSummaryCard.tsx
  src/modules/bikes/components/garage/ShareButton.tsx
  src/modules/bikes/components/garage/DuplicateBikeButton.tsx
  src/modules/bikes/components/garage/ExportImportSection.tsx
  src/modules/bikes/components/garage/ComparisonView.tsx
  src/app/bikes/garage/stats/page.tsx
  src/app/bikes/garage/stats/StatsClient.tsx
  src/app/bikes/garage/compare/page.tsx

MODIFY
  src/modules/bikes/lib/garage-queries.ts            — add getBikeStats, getBikesForCompare
  src/modules/bikes/components/garage/GarageView.tsx — stats link + compare mode
  src/app/bikes/garage/[bikeId]/page.tsx             — add WeightBreakdown, CostSummaryCard, actions
```

---

## Task 1: Add getBikeStats and getBikesForCompare queries

**Files:**
- Modify: `src/modules/bikes/lib/garage-queries.ts`
- Create: `src/modules/bikes/lib/garage-queries.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// src/modules/bikes/lib/garage-queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    userBike: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db/client'
import { getBikeStats, getBikesForCompare } from './garage-queries'

const mockBike = (overrides = {}) => ({
  id: 'bike-1',
  userId: 'user-1',
  name: 'Ripley',
  brand: 'Ibis',
  model: 'Ripley AF',
  year: 2022,
  category: 'trail',
  wheelSize: '29"',
  frameSize: 'L',
  weight: 27.5,
  purchasePrice: 3200,
  purchaseYear: 2022,
  frameMaterial: 'aluminum',
  travel: 120,
  imageUrl: null,
  isPrimary: true,
  notes: null,
  components: [
    { id: 'c-1', bikeId: 'bike-1', category: 'FORK', brand: 'Fox', model: '34', isActive: true, weightGrams: 2100, priceCents: 85000 },
    { id: 'c-2', bikeId: 'bike-1', category: 'DRIVETRAIN', brand: 'SRAM', model: 'GX', isActive: true, weightGrams: 1800, priceCents: 42000 },
    { id: 'c-3', bikeId: 'bike-1', category: 'WHEELS', brand: 'DT Swiss', model: 'M1900', isActive: false, weightGrams: 2500, priceCents: 60000 },
  ],
  ...overrides,
})

describe('getBikeStats', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns counts and totals for multiple bikes', async () => {
    vi.mocked(db.userBike.findMany).mockResolvedValue([
      mockBike({ id: 'bike-1', brand: 'Ibis', purchasePrice: 3200, components: [
        { id: 'c-1', category: 'FORK', brand: 'Fox', isActive: true, weightGrams: 2100, priceCents: 85000 },
      ]}),
      mockBike({ id: 'bike-2', brand: 'Trek', name: 'Slash', purchasePrice: 4000, components: [
        { id: 'c-2', category: 'FORK', brand: 'RockShox', isActive: true, weightGrams: 1900, priceCents: 70000 },
      ]}),
    ] as any)

    const stats = await getBikeStats('user-1')

    expect(stats.bikeCount).toBe(2)
    expect(stats.totalComponents).toBe(2)
    // totalInvestment = (3200 + 85000/100) + (4000 + 70000/100) = 3200+850 + 4000+700 = 8750
    expect(stats.totalInvestmentDollars).toBe(8750)
    expect(stats.brandCounts).toEqual({ Ibis: 1, Trek: 1 })
    expect(stats.categorySpending['FORK']).toBe(1550) // (85000 + 70000) / 100
  })

  it('only counts active components', async () => {
    vi.mocked(db.userBike.findMany).mockResolvedValue([mockBike()] as any)
    const stats = await getBikeStats('user-1')
    // bike has 2 active components (c-3 is inactive)
    expect(stats.totalComponents).toBe(2)
    expect(stats.bikeBreakdown[0].componentCount).toBe(2)
    // componentCost = (85000 + 42000) / 100 = 1270
    expect(stats.bikeBreakdown[0].componentCostDollars).toBe(1270)
    // weightGrams = 2100 + 1800 (not 2500 from inactive)
    expect(stats.bikeBreakdown[0].componentWeightGrams).toBe(3900)
  })

  it('returns empty stats when user has no bikes', async () => {
    vi.mocked(db.userBike.findMany).mockResolvedValue([])
    const stats = await getBikeStats('user-1')
    expect(stats.bikeCount).toBe(0)
    expect(stats.totalInvestmentDollars).toBe(0)
    expect(stats.bikeBreakdown).toHaveLength(0)
  })
})

describe('getBikesForCompare', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns bikes in the same order as bikeIds param', async () => {
    const b1 = mockBike({ id: 'bike-1', components: [] })
    const b2 = mockBike({ id: 'bike-2', name: 'Slash', components: [] })
    // DB returns in arbitrary order
    vi.mocked(db.userBike.findMany).mockResolvedValue([b2, b1] as any)

    const result = await getBikesForCompare(['bike-1', 'bike-2'], 'user-1')
    expect(result[0].id).toBe('bike-1')
    expect(result[1].id).toBe('bike-2')
  })

  it('excludes bikes not owned by userId', async () => {
    // DB WHERE clause filters by userId, so if not owned it won't be returned
    vi.mocked(db.userBike.findMany).mockResolvedValue([mockBike({ id: 'bike-1', components: [] })] as any)
    const result = await getBikesForCompare(['bike-1', 'bike-2'], 'user-1')
    // bike-2 was not returned by DB (not owned), so result only has 1
    expect(result).toHaveLength(1)
  })

  it('computes totalInvestmentDollars correctly', async () => {
    vi.mocked(db.userBike.findMany).mockResolvedValue([
      mockBike({ id: 'bike-1', purchasePrice: 3000, components: [
        { id: 'c-1', category: 'FORK', isActive: true, priceCents: 50000, weightGrams: 2000 },
      ]}),
    ] as any)
    const result = await getBikesForCompare(['bike-1'], 'user-1')
    expect(result[0].componentCostDollars).toBe(500) // 50000 / 100
    expect(result[0].totalInvestmentDollars).toBe(3500) // 3000 + 500
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/modules/bikes/lib/garage-queries.test.ts --reporter=verbose
```
Expected: FAIL — `getBikeStats is not a function` (or similar import error)

- [ ] **Step 3: Add the exported types and functions to garage-queries.ts**

Append to `src/modules/bikes/lib/garage-queries.ts` after the existing `deleteServiceLog` function:

```typescript
// ── Types ─────────────────────────────────────────────────────

export interface BikeStats {
  bikeCount: number
  totalInvestmentDollars: number
  totalComponents: number
  bikeBreakdown: {
    id: string
    name: string
    brand: string
    category: string
    purchasePriceDollars: number
    componentCostDollars: number
    componentCount: number
    frameWeightLbs: number | null
    componentWeightGrams: number
    componentBrandSpend: Record<string, number>
  }[]
  categorySpending: Record<string, number>
  brandCounts: Record<string, number>
  componentBrandSpend: Record<string, number>
}

export interface BikeCompareData {
  id: string
  brand: string
  name: string
  year: number | null
  category: string | null
  wheelSize: string | null
  frameSize: string | null
  frameMaterial: string | null
  travel: number | null
  frameWeightLbs: number | null
  componentCount: number
  componentCostDollars: number
  totalInvestmentDollars: number
  purchaseYear: number | null
  purchasePriceDollars: number | null
  imageUrl: string | null
}

// ── 9. getBikeStats ───────────────────────────────────────────

export async function getBikeStats(userId: string): Promise<BikeStats> {
  const bikes = await db.userBike.findMany({
    where: { userId },
    include: { components: { where: { isActive: true } } },
  })

  const categorySpending: Record<string, number> = {}
  const brandCounts: Record<string, number> = {}
  const componentBrandSpend: Record<string, number> = {}

  const bikeBreakdown = bikes.map(bike => {
    const active = bike.components
    const componentCostDollars = active.reduce((sum, c) => sum + (c.priceCents ?? 0), 0) / 100
    const componentWeightGrams = active.reduce((sum, c) => sum + (c.weightGrams ?? 0), 0)

    const localBrandSpend: Record<string, number> = {}
    for (const c of active) {
      if (c.priceCents) {
        const dollars = c.priceCents / 100
        categorySpending[c.category] = (categorySpending[c.category] ?? 0) + dollars
        componentBrandSpend[c.brand] = (componentBrandSpend[c.brand] ?? 0) + dollars
        localBrandSpend[c.brand] = (localBrandSpend[c.brand] ?? 0) + dollars
      }
    }

    brandCounts[bike.brand] = (brandCounts[bike.brand] ?? 0) + 1

    return {
      id: bike.id,
      name: bike.name,
      brand: bike.brand,
      category: bike.category as string,
      purchasePriceDollars: bike.purchasePrice ?? 0,
      componentCostDollars,
      componentCount: active.length,
      frameWeightLbs: bike.weight,
      componentWeightGrams,
      componentBrandSpend: localBrandSpend,
    }
  })

  return {
    bikeCount: bikes.length,
    totalInvestmentDollars: bikeBreakdown.reduce(
      (sum, b) => sum + b.purchasePriceDollars + b.componentCostDollars,
      0,
    ),
    totalComponents: bikeBreakdown.reduce((sum, b) => sum + b.componentCount, 0),
    bikeBreakdown,
    categorySpending,
    brandCounts,
    componentBrandSpend,
  }
}

// ── 10. getBikesForCompare ─────────────────────────────────────

export async function getBikesForCompare(
  bikeIds: string[],
  userId: string,
): Promise<BikeCompareData[]> {
  const bikes = await db.userBike.findMany({
    where: { id: { in: bikeIds }, userId },
    include: { components: { where: { isActive: true } } },
  })

  return bikeIds
    .map(id => bikes.find(b => b.id === id))
    .filter((b): b is NonNullable<typeof b> => b !== undefined)
    .map(bike => {
      const componentCostDollars = bike.components.reduce(
        (sum, c) => sum + (c.priceCents ?? 0),
        0,
      ) / 100
      return {
        id: bike.id,
        brand: bike.brand,
        name: bike.name,
        year: bike.year,
        category: bike.category as string,
        wheelSize: bike.wheelSize,
        frameSize: bike.frameSize,
        frameMaterial: bike.frameMaterial,
        travel: bike.travel,
        frameWeightLbs: bike.weight,
        componentCount: bike.components.length,
        componentCostDollars,
        totalInvestmentDollars: (bike.purchasePrice ?? 0) + componentCostDollars,
        purchaseYear: bike.purchaseYear,
        purchasePriceDollars: bike.purchasePrice,
        imageUrl: bike.imageUrl,
      }
    })
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/modules/bikes/lib/garage-queries.test.ts --reporter=verbose
```
Expected: All 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/modules/bikes/lib/garage-queries.ts src/modules/bikes/lib/garage-queries.test.ts
git commit -m "feat(bikes): add getBikeStats and getBikesForCompare queries"
```

---

## Task 2: Create garage-actions.ts (duplicateBike, exportBike, importBike)

**Files:**
- Create: `src/modules/bikes/actions/garage-actions.ts`
- Create: `src/modules/bikes/actions/garage-actions.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// src/modules/bikes/actions/garage-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/guards', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/db/client', () => {
  const tx = {
    userBike: { create: vi.fn() },
    bikeComponent: { create: vi.fn() },
    buildLogEntry: { create: vi.fn() },
  }
  return {
    db: {
      userBike: { findFirst: vi.fn() },
      $transaction: vi.fn().mockImplementation((fn: (tx: typeof tx) => unknown) => fn(tx)),
      _tx: tx,
    },
  }
})

import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'
import { duplicateBike, exportBike, importBike } from './garage-actions'

const tx = (db as any)._tx

function makeBike(overrides = {}) {
  return {
    id: 'bike-1',
    userId: 'user-1',
    name: 'Ripley',
    brand: 'Ibis',
    model: 'Ripley AF',
    year: 2022,
    category: 'trail',
    wheelSize: '29"',
    frameSize: 'L',
    weight: 27.5,
    isPrimary: true,
    notes: null,
    frameMaterial: 'aluminum',
    travel: 120,
    purchaseYear: 2022,
    purchasePrice: 3200,
    imageUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    components: [
      { id: 'c-1', bikeId: 'bike-1', category: 'FORK', brand: 'Fox', model: '34', year: 2022,
        weightGrams: 2100, priceCents: 85000, notes: null, isActive: true,
        installedAt: new Date(), removedAt: null, createdAt: new Date() },
    ],
    buildLog: [
      { id: 'bl-1', bikeId: 'bike-1', userId: 'user-1', title: 'New build',
        description: null, imageUrl: null, entryDate: new Date('2024-03-01'), createdAt: new Date() },
    ],
    ...overrides,
  }
}

describe('duplicateBike', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    tx.userBike.create.mockResolvedValue({ id: 'bike-new' })
    tx.bikeComponent.create.mockResolvedValue({})
  })

  it('creates a copy with isPrimary false and name appended "(copy)"', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(makeBike() as any)
    await duplicateBike('bike-1')

    expect(tx.userBike.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Ripley (copy)', isPrimary: false }),
      }),
    )
  })

  it('copies active components', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(makeBike() as any)
    await duplicateBike('bike-1')
    expect(tx.bikeComponent.create).toHaveBeenCalledTimes(1)
  })

  it('does NOT copy buildLog entries', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(makeBike() as any)
    await duplicateBike('bike-1')
    expect(tx.buildLogEntry.create).not.toHaveBeenCalled()
  })

  it('throws if bike not found', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(null)
    await expect(duplicateBike('bike-x')).rejects.toThrow('Bike not found')
  })
})

describe('exportBike', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
  })

  it('returns export structure with version 1', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(makeBike() as any)
    const result = await exportBike('bike-1')

    expect(result.version).toBe(1)
    expect(result.bike.name).toBe('Ripley')
    expect(result.bike.brand).toBe('Ibis')
    expect(result.components).toHaveLength(1)
    expect(result.components[0].category).toBe('FORK')
    expect(result.buildLog).toHaveLength(1)
    expect(result.buildLog[0].title).toBe('New build')
  })

  it('throws if bike not found', async () => {
    vi.mocked(db.userBike.findFirst).mockResolvedValue(null)
    await expect(exportBike('bike-x')).rejects.toThrow('Bike not found')
  })
})

describe('importBike', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    tx.userBike.create.mockResolvedValue({ id: 'bike-imported' })
    tx.bikeComponent.create.mockResolvedValue({})
    tx.buildLogEntry.create.mockResolvedValue({})
  })

  const validJson = JSON.stringify({
    version: 1,
    bike: { name: 'Slash', brand: 'Trek', model: '9.8', year: 2023, category: 'enduro' },
    components: [
      { category: 'FORK', brand: 'Fox', model: '38', year: 2023, weightGrams: 2300, priceCents: 100000, notes: null, isActive: true },
    ],
    buildLog: [
      { title: 'Initial build', description: null, entryDate: new Date().toISOString() },
    ],
  })

  it('creates bike, components, and buildLog in transaction', async () => {
    const result = await importBike(validJson)
    expect(result.bikeId).toBe('bike-imported')
    expect(tx.userBike.create).toHaveBeenCalledTimes(1)
    expect(tx.bikeComponent.create).toHaveBeenCalledTimes(1)
    expect(tx.buildLogEntry.create).toHaveBeenCalledTimes(1)
  })

  it('throws on invalid JSON', async () => {
    await expect(importBike('not-json')).rejects.toThrow('Invalid JSON file')
  })

  it('throws on invalid BikeCategory', async () => {
    const bad = JSON.stringify({ version: 1, bike: { name: 'X', brand: 'Y', model: 'Z', category: 'INVALID_CATEGORY' }, components: [], buildLog: [] })
    await expect(importBike(bad)).rejects.toThrow('Invalid bike category')
  })

  it('throws on invalid BikeComponentCategory', async () => {
    const bad = JSON.stringify({ version: 1, bike: { name: 'X', brand: 'Y', model: 'Z', category: 'trail' }, components: [{ category: 'TURBO', brand: 'X', model: 'X', isActive: true }], buildLog: [] })
    await expect(importBike(bad)).rejects.toThrow('Invalid component category')
  })

  it('throws on missing bike name', async () => {
    const bad = JSON.stringify({ version: 1, bike: { name: '', brand: 'Trek', model: 'Slash' }, components: [], buildLog: [] })
    await expect(importBike(bad)).rejects.toThrow('Missing bike name')
  })

  it('throws on unsupported version', async () => {
    const bad = JSON.stringify({ version: 2, bike: { name: 'X' }, components: [], buildLog: [] })
    await expect(importBike(bad)).rejects.toThrow('Unsupported export version')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/modules/bikes/actions/garage-actions.test.ts --reporter=verbose
```
Expected: FAIL — module not found

- [ ] **Step 3: Create garage-actions.ts**

```typescript
// src/modules/bikes/actions/garage-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

const BIKE_CATEGORIES = ['gravel', 'xc', 'trail', 'enduro', 'downhill', 'dirt_jump', 'ebike', 'other'] as const
const COMPONENT_CATEGORIES = ['FRAME', 'FORK', 'SHOCK', 'WHEELS', 'DRIVETRAIN', 'BRAKES', 'COCKPIT', 'SEATPOST', 'SADDLE', 'PEDALS', 'OTHER'] as const

// ── duplicateBike ─────────────────────────────────────────────

export async function duplicateBike(bikeId: string): Promise<{ bikeId: string }> {
  const user = await requireAuth()

  const original = await db.userBike.findFirst({
    where: { id: bikeId, userId: user.id },
    include: { components: true },
  })
  if (!original) throw new Error('Bike not found')

  const { id, createdAt, updatedAt, components, ...bikeData } = original

  const newBike = await db.$transaction(async (tx) => {
    const bike = await tx.userBike.create({
      data: {
        ...bikeData,
        name: `${bikeData.name} (copy)`,
        isPrimary: false,
      },
    })

    for (const { id: _cId, bikeId: _bId, createdAt: _cCa, ...componentData } of components) {
      await tx.bikeComponent.create({
        data: { ...componentData, bikeId: bike.id },
      })
    }

    return bike
  })

  revalidatePath('/bikes/garage')
  return { bikeId: newBike.id }
}

// ── exportBike ────────────────────────────────────────────────

export interface BikeExportData {
  exportedAt: string
  version: 1
  bike: {
    name: string; brand: string; model: string; year: number | null
    category: string | null; wheelSize: string | null; frameSize: string | null
    frameMaterial: string | null; travel: number | null; weight: number | null
    purchaseYear: number | null; purchasePrice: number | null; notes: string | null
  }
  components: {
    category: string; brand: string; model: string; year: number | null
    weightGrams: number | null; priceCents: number | null; notes: string | null
    isActive: boolean
  }[]
  buildLog: { title: string; description: string | null; entryDate: string }[]
}

export async function exportBike(bikeId: string): Promise<BikeExportData> {
  const user = await requireAuth()

  const bike = await db.userBike.findFirst({
    where: { id: bikeId, userId: user.id },
    include: {
      components: true,
      buildLog: { orderBy: { entryDate: 'asc' } },
    },
  })
  if (!bike) throw new Error('Bike not found')

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    bike: {
      name: bike.name,
      brand: bike.brand,
      model: bike.model,
      year: bike.year,
      category: bike.category,
      wheelSize: bike.wheelSize,
      frameSize: bike.frameSize,
      frameMaterial: bike.frameMaterial,
      travel: bike.travel,
      weight: bike.weight,
      purchaseYear: bike.purchaseYear,
      purchasePrice: bike.purchasePrice,
      notes: bike.notes,
    },
    components: bike.components.map(c => ({
      category: c.category,
      brand: c.brand,
      model: c.model,
      year: c.year,
      weightGrams: c.weightGrams,
      priceCents: c.priceCents,
      notes: c.notes,
      isActive: c.isActive,
    })),
    buildLog: bike.buildLog.map(e => ({
      title: e.title,
      description: e.description,
      entryDate: e.entryDate.toISOString(),
    })),
  }
}

// ── importBike ────────────────────────────────────────────────

export async function importBike(jsonString: string): Promise<{ bikeId: string }> {
  const user = await requireAuth()

  let data: unknown
  try {
    data = JSON.parse(jsonString)
  } catch {
    throw new Error('Invalid JSON file')
  }

  if (typeof data !== 'object' || data === null || !('version' in data)) {
    throw new Error('Invalid export file format')
  }

  const d = data as BikeExportData
  if (d.version !== 1) throw new Error('Unsupported export version')
  if (typeof d.bike?.name !== 'string' || !d.bike.name.trim()) throw new Error('Missing bike name')

  if (d.bike.category && !BIKE_CATEGORIES.includes(d.bike.category as typeof BIKE_CATEGORIES[number])) {
    throw new Error(`Invalid bike category: ${d.bike.category}`)
  }
  for (const c of d.components ?? []) {
    if (!COMPONENT_CATEGORIES.includes(c.category as typeof COMPONENT_CATEGORIES[number])) {
      throw new Error(`Invalid component category: ${c.category}`)
    }
  }

  const newBike = await db.$transaction(async (tx) => {
    const bike = await tx.userBike.create({
      data: {
        userId: user.id,
        name: d.bike.name.trim(),
        brand: d.bike.brand ?? 'Unknown',
        model: d.bike.model ?? 'Unknown',
        year: d.bike.year ?? null,
        category: (d.bike.category as (typeof BIKE_CATEGORIES[number])) ?? 'other',
        wheelSize: d.bike.wheelSize ?? null,
        frameSize: d.bike.frameSize ?? null,
        frameMaterial: d.bike.frameMaterial ?? null,
        travel: d.bike.travel ?? null,
        weight: d.bike.weight ?? null,
        purchaseYear: d.bike.purchaseYear ?? null,
        purchasePrice: d.bike.purchasePrice ?? null,
        notes: d.bike.notes ?? null,
        isPrimary: false,
      },
    })

    for (const c of d.components ?? []) {
      await tx.bikeComponent.create({
        data: {
          bikeId: bike.id,
          category: c.category as typeof COMPONENT_CATEGORIES[number],
          brand: c.brand ?? 'Unknown',
          model: c.model ?? 'Unknown',
          year: c.year ?? null,
          weightGrams: c.weightGrams ?? null,
          priceCents: c.priceCents ?? null,
          notes: c.notes ?? null,
          isActive: c.isActive ?? true,
        },
      })
    }

    for (const e of d.buildLog ?? []) {
      if (typeof e.title === 'string' && e.title.trim()) {
        await tx.buildLogEntry.create({
          data: {
            bikeId: bike.id,
            userId: user.id,
            title: e.title.trim(),
            description: e.description ?? null,
            entryDate: new Date(e.entryDate),
          },
        })
      }
    }

    return bike
  })

  revalidatePath('/bikes/garage')
  return { bikeId: newBike.id }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/modules/bikes/actions/garage-actions.test.ts --reporter=verbose
```
Expected: All 11 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/modules/bikes/actions/garage-actions.ts src/modules/bikes/actions/garage-actions.test.ts
git commit -m "feat(bikes): add duplicateBike, exportBike, importBike server actions"
```

---

## Task 3: WeightBreakdown and CostSummaryCard components

**Files:**
- Create: `src/modules/bikes/components/garage/WeightBreakdown.tsx`
- Create: `src/modules/bikes/components/garage/CostSummaryCard.tsx`

- [ ] **Step 1: Create WeightBreakdown.tsx**

```tsx
// src/modules/bikes/components/garage/WeightBreakdown.tsx
'use client'

import { useState } from 'react'

type Unit = 'g' | 'lbs' | 'oz'

interface WeightBreakdownProps {
  categoryWeights: { category: string; weightGrams: number }[]
  totalWeightGrams: number
}

function convertWeight(grams: number, unit: Unit): string {
  if (unit === 'lbs') return (grams / 453.592).toFixed(2)
  if (unit === 'oz') return (grams / 28.3495).toFixed(1)
  return grams.toString()
}

export function WeightBreakdown({ categoryWeights, totalWeightGrams }: WeightBreakdownProps) {
  const [unit, setUnit] = useState<Unit>('g')

  if (categoryWeights.length === 0) return null

  const sorted = [...categoryWeights].sort((a, b) => b.weightGrams - a.weightGrams)

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)]">Component Weight</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Total:{' '}
            <strong className="text-[var(--color-text)]">
              {convertWeight(totalWeightGrams, unit)}{unit}
            </strong>
          </p>
        </div>
        <div className="flex gap-0.5 rounded-lg border border-[var(--color-border)] p-0.5">
          {(['g', 'lbs', 'oz'] as Unit[]).map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={[
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                unit === u
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {sorted.map(({ category, weightGrams }) => (
          <div key={category}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="capitalize text-[var(--color-text-muted)]">
                {category.toLowerCase()}
              </span>
              <span className="font-medium text-[var(--color-text)]">
                {convertWeight(weightGrams, unit)}{unit}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)]"
                style={{ width: `${Math.round((weightGrams / totalWeightGrams) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create CostSummaryCard.tsx**

```tsx
// src/modules/bikes/components/garage/CostSummaryCard.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CostSummaryCardProps {
  purchasePriceDollars: number
  componentCostDollars: number
  componentCount: number
  categoryBreakdown: { category: string; totalDollars: number }[]
}

export function CostSummaryCard({
  purchasePriceDollars,
  componentCostDollars,
  componentCount,
  categoryBreakdown,
}: CostSummaryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const total = purchasePriceDollars + componentCostDollars

  if (total === 0) return null

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">Cost Summary</h2>

      <div className="space-y-2">
        {purchasePriceDollars > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Purchase price</span>
            <span className="font-medium text-[var(--color-text)]">
              ${purchasePriceDollars.toLocaleString()}
            </span>
          </div>
        )}
        {componentCostDollars > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">
              Components ({componentCount})
            </span>
            <span className="font-medium text-[var(--color-text)]">
              ${Math.round(componentCostDollars).toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-sm font-semibold">
          <span className="text-[var(--color-text)]">Total</span>
          <span className="text-[var(--color-primary)]">
            ${Math.round(total).toLocaleString()}
          </span>
        </div>
      </div>

      {categoryBreakdown.some(c => c.totalDollars > 0) && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide' : 'Show'} breakdown
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-1.5 rounded-lg bg-[var(--color-bg)] px-3 py-2">
          {categoryBreakdown
            .filter(c => c.totalDollars > 0)
            .sort((a, b) => b.totalDollars - a.totalDollars)
            .map(({ category, totalDollars }) => (
              <div key={category} className="flex justify-between text-xs">
                <span className="capitalize text-[var(--color-text-muted)]">
                  {category.toLowerCase()}
                </span>
                <span className="text-[var(--color-text)]">
                  ${Math.round(totalDollars).toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "WeightBreakdown|CostSummaryCard" | head -10
```
Expected: No errors for these files

- [ ] **Step 4: Commit**

```bash
git add src/modules/bikes/components/garage/WeightBreakdown.tsx src/modules/bikes/components/garage/CostSummaryCard.tsx
git commit -m "feat(bikes): add WeightBreakdown and CostSummaryCard components"
```

---

## Task 4: Stats page

**Files:**
- Create: `src/app/bikes/garage/stats/page.tsx`
- Create: `src/app/bikes/garage/stats/StatsClient.tsx`

- [ ] **Step 1: Create StatsClient.tsx**

```tsx
// src/app/bikes/garage/stats/StatsClient.tsx
'use client'

import { useState } from 'react'
import { Card } from '@/ui/components'
import type { BikeStats } from '@/modules/bikes/lib/garage-queries'

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280', '#14b8a6',
]

export function StatsClient({ stats }: { stats: BikeStats }) {
  const [tab, setTab] = useState<'overview' | 'costs' | 'components'>('overview')

  const sortedBrands = Object.entries(stats.brandCounts).sort((a, b) => b[1] - a[1])
  const sortedCategories = Object.entries(stats.categorySpending).sort((a, b) => b[1] - a[1])
  const sortedComponentBrands = Object.entries(stats.componentBrandSpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxBrandCount = Math.max(1, ...sortedBrands.map(([, c]) => c))
  const maxCategorySpend = Math.max(1, ...sortedCategories.map(([, v]) => v))
  const maxComponentBrandSpend = Math.max(1, ...sortedComponentBrands.map(([, v]) => v))
  const maxBikeCost = Math.max(
    1,
    ...stats.bikeBreakdown.map(b => b.purchasePriceDollars + b.componentCostDollars),
  )

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'costs' as const, label: 'Costs' },
    { id: 'components' as const, label: 'Components' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex w-fit gap-0.5 rounded-lg border border-[var(--color-border)] p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'rounded px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs text-[var(--color-text-muted)]">Bikes</p>
              <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{stats.bikeCount}</p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--color-text-muted)]">Total Investment</p>
              <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">
                ${Math.round(stats.totalInvestmentDollars).toLocaleString()}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--color-text-muted)]">Components</p>
              <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{stats.totalComponents}</p>
            </Card>
          </div>

          {sortedBrands.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">Brands</h2>
              <div className="space-y-2.5">
                {sortedBrands.map(([brand, count]) => (
                  <div key={brand}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-[var(--color-text-muted)]">{brand}</span>
                      <span className="font-medium text-[var(--color-text)]">
                        {count} {count === 1 ? 'bike' : 'bikes'}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${Math.round((count / maxBrandCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.bikeCount === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              No bikes in your garage yet.{' '}
              <a href="/bikes/garage/new" className="text-[var(--color-primary)]">Add your first bike</a>
            </p>
          )}
        </div>
      )}

      {tab === 'costs' && (
        <div className="space-y-6">
          {stats.bikeBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No bikes in your garage yet.</p>
          ) : (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">Cost by Bike</h2>
              <div className="space-y-4">
                {stats.bikeBreakdown.map(bike => {
                  const total = bike.purchasePriceDollars + bike.componentCostDollars
                  return (
                    <div key={bike.id}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-[var(--color-text-muted)]">
                          {bike.brand} {bike.name}
                        </span>
                        <span className="font-medium text-[var(--color-text)]">
                          ${Math.round(total).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex h-4 overflow-hidden rounded-full bg-[var(--color-border)]">
                        {bike.purchasePriceDollars > 0 && (
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${Math.round((bike.purchasePriceDollars / maxBikeCost) * 100)}%` }}
                            title={`Purchase: $${bike.purchasePriceDollars}`}
                          />
                        )}
                        {bike.componentCostDollars > 0 && (
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${Math.round((bike.componentCostDollars / maxBikeCost) * 100)}%` }}
                            title={`Components: $${Math.round(bike.componentCostDollars)}`}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex gap-4 text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />
                  Purchase
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-3 rounded-sm bg-blue-500" />
                  Components
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'components' && (
        <div className="space-y-6">
          {sortedCategories.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
                Spending by Category
              </h2>
              <div className="space-y-2.5">
                {sortedCategories.map(([category, total], i) => (
                  <div key={category}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="capitalize text-[var(--color-text-muted)]">
                        {category.toLowerCase()}
                      </span>
                      <span className="font-medium text-[var(--color-text)]">
                        ${Math.round(total).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((total / maxCategorySpend) * 100)}%`,
                          backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedComponentBrands.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
                Top Component Brands by Spend
              </h2>
              <div className="space-y-2.5">
                {sortedComponentBrands.map(([brand, total]) => (
                  <div key={brand}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-[var(--color-text-muted)]">{brand}</span>
                      <span className="font-medium text-[var(--color-text)]">
                        ${Math.round(total).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${Math.round((total / maxComponentBrandSpend) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedCategories.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              No component costs recorded yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create stats/page.tsx**

```tsx
// src/app/bikes/garage/stats/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { getBikeStats } from '@/modules/bikes/lib/garage-queries'
import { StatsClient } from './StatsClient'

export const metadata: Metadata = {
  title: 'Garage Stats | Ride MTB',
}

export default async function GarageStatsPage() {
  const user = await requireAuth()
  const stats = await getBikeStats(user.id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/bikes/garage"
          className="flex items-center gap-1 transition-colors hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          My Garage
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Stats</span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold text-[var(--color-text)]">Garage Stats</h1>

      <StatsClient stats={stats} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "garage/stats" | head -10
```
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/bikes/garage/stats/
git commit -m "feat(bikes): add garage stats page with Overview/Costs/Components tabs"
```

---

## Task 5: Compare page and ComparisonView

**Files:**
- Create: `src/modules/bikes/components/garage/ComparisonView.tsx`
- Create: `src/app/bikes/garage/compare/page.tsx`

- [ ] **Step 1: Create ComparisonView.tsx**

```tsx
// src/modules/bikes/components/garage/ComparisonView.tsx
'use client'

import Link from 'next/link'
import type { BikeCompareData } from '@/modules/bikes/lib/garage-queries'

const CATEGORY_LABELS: Record<string, string> = {
  gravel: 'Gravel', xc: 'XC', trail: 'Trail', enduro: 'Enduro',
  downhill: 'Downhill', dirt_jump: 'Dirt Jump', ebike: 'E-Bike', other: 'Other',
}

function bestIndex(values: (number | null)[], prefer: 'min' | 'max'): number | null {
  const indexed = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v !== null)
  if (indexed.length < 2) return null
  return prefer === 'min'
    ? indexed.reduce((a, b) => a.v <= b.v ? a : b).i
    : indexed.reduce((a, b) => a.v >= b.v ? a : b).i
}

interface Row {
  label: string
  render: (b: BikeCompareData) => string | null
  rawValue?: (b: BikeCompareData) => number | null
  prefer?: 'min' | 'max'
}

const ROWS: Row[] = [
  { label: 'Brand', render: b => b.brand },
  { label: 'Year', render: b => b.year?.toString() ?? null, rawValue: b => b.year, prefer: 'max' },
  { label: 'Category', render: b => b.category ? (CATEGORY_LABELS[b.category] ?? b.category) : null },
  { label: 'Wheel Size', render: b => b.wheelSize },
  { label: 'Frame Size', render: b => b.frameSize },
  { label: 'Frame Material', render: b => b.frameMaterial },
  { label: 'Travel', render: b => b.travel != null ? `${b.travel}mm` : null, rawValue: b => b.travel, prefer: 'max' },
  { label: 'Frame Weight', render: b => b.frameWeightLbs != null ? `${b.frameWeightLbs} lbs` : null, rawValue: b => b.frameWeightLbs, prefer: 'min' },
  { label: 'Components', render: b => b.componentCount.toString(), rawValue: b => b.componentCount, prefer: 'max' },
  { label: 'Component Cost', render: b => b.componentCostDollars > 0 ? `$${Math.round(b.componentCostDollars).toLocaleString()}` : null, rawValue: b => b.componentCostDollars || null, prefer: 'min' },
  { label: 'Total Investment', render: b => b.totalInvestmentDollars > 0 ? `$${Math.round(b.totalInvestmentDollars).toLocaleString()}` : null, rawValue: b => b.totalInvestmentDollars || null, prefer: 'min' },
  { label: 'Purchase Year', render: b => b.purchaseYear?.toString() ?? null, rawValue: b => b.purchaseYear, prefer: 'max' },
]

export function ComparisonView({ bikes }: { bikes: BikeCompareData[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]" />
            {bikes.map(bike => (
              <th key={bike.id} className="px-4 py-3 text-left">
                <Link
                  href={`/bikes/garage/${bike.id}`}
                  className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
                >
                  {bike.brand} {bike.name}
                </Link>
                {bike.year && (
                  <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">
                    {bike.year}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(row => {
            const rendered = bikes.map(b => row.render(b))
            if (rendered.every(v => v === null)) return null

            const rawValues = row.rawValue ? bikes.map(b => row.rawValue!(b)) : []
            const best = row.prefer && rawValues.length > 0 ? bestIndex(rawValues, row.prefer) : null

            return (
              <tr key={row.label} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">
                  {row.label}
                </td>
                {bikes.map((bike, i) => (
                  <td
                    key={bike.id}
                    className={[
                      'px-4 py-3',
                      best === i
                        ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--color-text)]',
                    ].join(' ')}
                  >
                    {rendered[i] ?? (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create compare/page.tsx**

```tsx
// src/app/bikes/garage/compare/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { getBikesForCompare } from '@/modules/bikes/lib/garage-queries'
import { ComparisonView } from '@/modules/bikes/components/garage/ComparisonView'

export const metadata: Metadata = { title: 'Compare Bikes | Ride MTB' }

interface Props {
  searchParams: Promise<{ bikes?: string }>
}

export default async function ComparePage({ searchParams }: Props) {
  const { bikes: bikesParam } = await searchParams

  if (!bikesParam) redirect('/bikes/garage')

  const bikeIds = bikesParam.split(',').filter(Boolean)
  if (bikeIds.length < 2 || bikeIds.length > 3) redirect('/bikes/garage')

  const user = await requireAuth()
  const bikes = await getBikesForCompare(bikeIds, user.id)

  if (bikes.length < 2) redirect('/bikes/garage')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/bikes/garage"
          className="flex items-center gap-1 transition-colors hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          My Garage
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Compare</span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold text-[var(--color-text)]">Compare Bikes</h1>

      <ComparisonView bikes={bikes} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "compare|ComparisonView" | head -10
```
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/bikes/components/garage/ComparisonView.tsx src/app/bikes/garage/compare/
git commit -m "feat(bikes): add compare page and ComparisonView component"
```

---

## Task 6: Bike detail action buttons

**Files:**
- Create: `src/modules/bikes/components/garage/ShareButton.tsx`
- Create: `src/modules/bikes/components/garage/DuplicateBikeButton.tsx`
- Create: `src/modules/bikes/components/garage/ExportImportSection.tsx`

- [ ] **Step 1: Create ShareButton.tsx**

```tsx
// src/modules/bikes/components/garage/ShareButton.tsx
'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API not available (non-HTTPS or permissions denied)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
```

- [ ] **Step 2: Create DuplicateBikeButton.tsx**

```tsx
// src/modules/bikes/components/garage/DuplicateBikeButton.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { duplicateBike } from '@/modules/bikes/actions/garage-actions'

export function DuplicateBikeButton({ bikeId }: { bikeId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDuplicate = () => {
    if (!confirm('Duplicate this bike and all its components?')) return
    startTransition(async () => {
      const { bikeId: newId } = await duplicateBike(bikeId)
      router.push(`/bikes/garage/${newId}`)
    })
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
    >
      <Copy className="h-4 w-4" />
      {isPending ? 'Duplicating…' : 'Duplicate'}
    </button>
  )
}
```

- [ ] **Step 3: Create ExportImportSection.tsx**

```tsx
// src/modules/bikes/components/garage/ExportImportSection.tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Upload } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { exportBike, importBike } from '@/modules/bikes/actions/garage-actions'

export function ExportImportSection({ bikeId }: { bikeId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [exporting, startExport] = useTransition()
  const [importing, startImport] = useTransition()

  const handleExport = () => {
    startExport(async () => {
      try {
        const data = await exportBike(bikeId)
        const json = JSON.stringify(data, null, 2)
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `bike-export-${bikeId}.json`
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        // export failure — silently ignore (rare, e.g. auth expired)
      }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      startImport(async () => {
        try {
          const { bikeId: newId } = await importBike(text)
          router.push(`/bikes/garage/${newId}`)
        } catch (err) {
          setImportError(err instanceof Error ? err.message : 'Import failed. Check the file format.')
        }
      })
    }
    reader.readAsText(file)
    e.target.value = '' // reset so same file can be re-selected
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">Export / Import</h2>
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        Export your bike and components as JSON, or import a previously exported file.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export JSON'}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {importing ? 'Importing…' : 'Import JSON'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>
      {importError && (
        <p className="mt-2 text-sm text-red-500">{importError}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "ShareButton|DuplicateBike|ExportImport" | head -10
```
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/bikes/components/garage/ShareButton.tsx src/modules/bikes/components/garage/DuplicateBikeButton.tsx src/modules/bikes/components/garage/ExportImportSection.tsx
git commit -m "feat(bikes): add ShareButton, DuplicateBikeButton, ExportImportSection"
```

---

## Task 7: Wire new components into bike detail page

**Files:**
- Modify: `src/app/bikes/garage/[bikeId]/page.tsx`

The overview tab currently shows: specs grid → notes → recent service → edit form → danger zone.

Add after the specs grid (line ~153, before the notes section):
1. `CostSummaryCard` (cost data derived inline)
2. `WeightBreakdown` (weight data derived inline)
3. `ExportImportSection`

Add `ShareButton` and `DuplicateBikeButton` to the danger zone actions row.

- [ ] **Step 1: Update the bike detail page**

Replace `src/app/bikes/garage/[bikeId]/page.tsx` with the following (full file):

```tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, Badge } from '@/ui/components'
import { BikeForm, ServiceLogList, DeleteBikeButton } from '@/modules/bikes'
import { ComponentTable } from '@/modules/bikes/components/ComponentTable'
import { BuildLogTimeline } from '@/modules/bikes/components/BuildLogTimeline'
import { MaintenanceList } from '@/modules/bikes/components/MaintenanceList'
import { BikeTabs } from '@/modules/bikes/components/garage/BikeTabs'
import { WeightBreakdown } from '@/modules/bikes/components/garage/WeightBreakdown'
import { CostSummaryCard } from '@/modules/bikes/components/garage/CostSummaryCard'
import { ShareButton } from '@/modules/bikes/components/garage/ShareButton'
import { DuplicateBikeButton } from '@/modules/bikes/components/garage/DuplicateBikeButton'
import { ExportImportSection } from '@/modules/bikes/components/garage/ExportImportSection'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { getBikeWithDetails } from '@/modules/bikes/lib/garage-queries'
import type { BikeCategory } from '@/modules/bikes'

const categoryBadgeVariant: Record<BikeCategory, 'default' | 'success' | 'info' | 'warning' | 'error'> = {
  gravel: 'default',
  xc: 'success',
  trail: 'info',
  enduro: 'warning',
  downhill: 'error',
  dirt_jump: 'default',
  ebike: 'info',
  other: 'default',
}

const categoryLabel: Record<BikeCategory, string> = {
  gravel: 'Gravel',
  xc: 'XC',
  trail: 'Trail',
  enduro: 'Enduro',
  downhill: 'Downhill',
  dirt_jump: 'Dirt Jump',
  ebike: 'E-Bike',
  other: 'Other',
}

interface Props {
  params: Promise<{ bikeId: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bikeId } = await params
  const user = await requireAuth()
  const bike = await getBikeWithDetails(bikeId, user.id)

  if (!bike) {
    return { title: 'Bike Not Found | Ride MTB' }
  }

  return {
    title: `${bike.name} | Ride MTB`,
    description: `${bike.brand} ${bike.model} — service history and details.`,
  }
}

export default async function BikeDetailPage({ params, searchParams }: Props) {
  const { bikeId } = await params
  const { tab = 'overview' } = await searchParams
  const user = await requireAuth()
  const bike = await getBikeWithDetails(bikeId, user.id)

  if (!bike) {
    notFound()
  }

  const yearDisplay = bike.year ? `${bike.year} ` : ''

  // Compute cost and weight data for overview tab
  const activeComponents = bike.components.filter(c => c.isActive)
  const componentCostDollars = activeComponents.reduce((sum, c) => sum + (c.priceCents ?? 0), 0) / 100
  const purchasePriceDollars = bike.purchasePrice ?? 0

  // Group component weights by category
  const categoryWeightMap = new Map<string, number>()
  for (const c of activeComponents) {
    if (c.weightGrams) {
      categoryWeightMap.set(
        c.category,
        (categoryWeightMap.get(c.category) ?? 0) + c.weightGrams,
      )
    }
  }
  const categoryWeights = Array.from(categoryWeightMap.entries()).map(([category, weightGrams]) => ({
    category,
    weightGrams,
  }))
  const totalWeightGrams = categoryWeights.reduce((sum, cw) => sum + cw.weightGrams, 0)

  // Category breakdown for cost card
  const categoryBreakdownMap = new Map<string, number>()
  for (const c of activeComponents) {
    if (c.priceCents) {
      categoryBreakdownMap.set(
        c.category,
        (categoryBreakdownMap.get(c.category) ?? 0) + c.priceCents / 100,
      )
    }
  }
  const categoryBreakdown = Array.from(categoryBreakdownMap.entries()).map(([category, totalDollars]) => ({
    category,
    totalDollars,
  }))
  const costComponentCount = activeComponents.filter(c => c.priceCents).length

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/bikes/garage"
          className="transition-colors hover:text-[var(--color-text)]"
        >
          My Garage
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{bike.name}</span>
      </nav>

      {/* Bike header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[var(--color-text)]">
              {bike.name}
            </h1>
            {bike.isPrimary && <Badge variant="gold">Primary</Badge>}
          </div>
          <p className="mt-1 text-[var(--color-text-muted)]">
            {yearDisplay}{bike.brand} {bike.model}
          </p>
        </div>
        <Badge variant={categoryBadgeVariant[bike.category as BikeCategory]}>
          {categoryLabel[bike.category as BikeCategory]}
        </Badge>
      </div>

      {/* Bike image */}
      {bike.imageUrl && (
        <Card className="mb-8 overflow-hidden p-0">
          <Image
            src={bike.imageUrl}
            alt={bike.name}
            width={800}
            height={256}
            className="h-64 w-full object-cover"
            unoptimized
          />
        </Card>
      )}

      {/* Tabs */}
      <BikeTabs bikeId={bike.id} activeTab={tab} />

      {/* Tab content */}
      <div className="mt-6">
        {tab === 'overview' && (
          <>
            {/* Bike details */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {bike.wheelSize && (
                <Card>
                  <p className="text-xs text-[var(--color-text-muted)]">Wheel Size</p>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{bike.wheelSize}</p>
                </Card>
              )}
              {bike.frameSize && (
                <Card>
                  <p className="text-xs text-[var(--color-text-muted)]">Frame Size</p>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{bike.frameSize}</p>
                </Card>
              )}
              {bike.weight != null && (
                <Card>
                  <p className="text-xs text-[var(--color-text-muted)]">Weight</p>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{bike.weight} lbs</p>
                </Card>
              )}
              {bike.travel != null && (
                <Card>
                  <p className="text-xs text-[var(--color-text-muted)]">Travel</p>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{bike.travel}mm</p>
                </Card>
              )}
              <Card>
                <p className="text-xs text-[var(--color-text-muted)]">Service Entries</p>
                <p className="mt-1 font-medium text-[var(--color-text)]">{bike.serviceLogs.length}</p>
              </Card>
            </div>

            {/* Cost summary */}
            {purchasePriceDollars + componentCostDollars > 0 && (
              <div className="mb-6">
                <CostSummaryCard
                  purchasePriceDollars={purchasePriceDollars}
                  componentCostDollars={componentCostDollars}
                  componentCount={costComponentCount}
                  categoryBreakdown={categoryBreakdown}
                />
              </div>
            )}

            {/* Weight breakdown */}
            {categoryWeights.length > 0 && (
              <div className="mb-6">
                <WeightBreakdown
                  categoryWeights={categoryWeights}
                  totalWeightGrams={totalWeightGrams}
                />
              </div>
            )}

            {/* Export / Import */}
            <div className="mb-8">
              <ExportImportSection bikeId={bike.id} />
            </div>

            {/* Notes */}
            {bike.notes && (
              <div className="mb-8">
                <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Notes</h2>
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{bike.notes}</p>
              </div>
            )}

            {/* Recent service history */}
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-[var(--color-text)]">
                  Recent Service
                </h2>
                <Link
                  href={`/bikes/garage/${bike.id}/service/new`}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
                >
                  Log Service
                </Link>
              </div>
              <ServiceLogList logs={bike.serviceLogs} bikeId={bike.id} />
            </section>

            {/* Edit form */}
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
                Edit Bike
              </h2>
              <Card>
                <BikeForm bike={bike} />
              </Card>
            </section>

            {/* Danger zone */}
            <section>
              <h2 className="mb-4 text-xl font-bold text-red-600">
                Danger Zone
              </h2>
              <Card className="border-red-200">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <ShareButton />
                  <DuplicateBikeButton bikeId={bike.id} />
                </div>
                <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                  Permanently delete this bike and all its service history. This action cannot be undone.
                </p>
                <DeleteBikeButton bikeId={bike.id} />
              </Card>
            </section>
          </>
        )}

        {tab === 'components' && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">Components</h2>
            <ComponentTable bikeId={bike.id} components={bike.components} />
          </section>
        )}

        {tab === 'build-log' && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">Build Log</h2>
            <BuildLogTimeline bikeId={bike.id} entries={bike.buildLog} />
          </section>
        )}

        {tab === 'maintenance' && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">Maintenance</h2>
            <MaintenanceList tasks={bike.maintenanceTasks} />
          </section>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "bikeId/page" | head -10
```
Expected: No errors

- [ ] **Step 3: Run all tests**

```bash
npx vitest run --reporter=verbose 2>&1 | grep -E "PASS|FAIL|Tests"
```
Expected: Same pass count as baseline (240), same 2 pre-existing failures only

- [ ] **Step 4: Commit**

```bash
git add src/app/bikes/garage/\[bikeId\]/page.tsx
git commit -m "feat(bikes): add WeightBreakdown, CostSummary, Export/Import, Share, Duplicate to bike detail"
```

---

## Task 8: GarageView — stats link and compare mode

**Files:**
- Modify: `src/modules/bikes/components/garage/GarageView.tsx`

- [ ] **Step 1: Replace GarageView.tsx with compare mode support**

```tsx
// src/modules/bikes/components/garage/GarageView.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bike, BarChart2, GitCompare } from 'lucide-react'
import { Button, EmptyState } from '@/ui/components'
import type { UserBikeData } from '../../types/garage'
import { BikeCard } from './BikeCard'

interface GarageViewProps {
  bikes: UserBikeData[]
}

export function GarageView({ bikes }: GarageViewProps) {
  const router = useRouter()
  const [compareMode, setCompareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev // cap at 3
      return [...prev, id]
    })
  }

  const handleCompare = () => {
    if (selectedIds.length >= 2) {
      router.push(`/bikes/garage/compare?bikes=${selectedIds.join(',')}`)
    }
  }

  const exitCompareMode = () => {
    setCompareMode(false)
    setSelectedIds([])
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">My Garage</h1>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Manage your bikes and track service history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {bikes.length > 0 && (
            <Link href="/bikes/garage/stats">
              <Button variant="outline" size="sm">
                <BarChart2 className="mr-1.5 h-4 w-4" />
                Stats
              </Button>
            </Link>
          )}

          {bikes.length >= 2 && !compareMode && (
            <Button variant="outline" size="sm" onClick={() => setCompareMode(true)}>
              <GitCompare className="mr-1.5 h-4 w-4" />
              Compare
            </Button>
          )}

          {compareMode && (
            <>
              <Button
                size="sm"
                onClick={handleCompare}
                disabled={selectedIds.length < 2}
              >
                Compare ({selectedIds.length})
              </Button>
              <Button variant="outline" size="sm" onClick={exitCompareMode}>
                Cancel
              </Button>
            </>
          )}

          {!compareMode && (
            <Link href="/bikes/garage/new">
              <Button>Add Bike</Button>
            </Link>
          )}
        </div>
      </div>

      {bikes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bikes.map(bike => (
            compareMode ? (
              <div
                key={bike.id}
                onClick={() => toggleSelect(bike.id)}
                className={[
                  'relative cursor-pointer rounded-lg transition-all',
                  selectedIds.includes(bike.id)
                    ? 'ring-2 ring-[var(--color-primary)] ring-offset-2'
                    : 'opacity-80 hover:opacity-100',
                  selectedIds.length >= 3 && !selectedIds.includes(bike.id)
                    ? 'cursor-not-allowed opacity-40'
                    : '',
                ].join(' ')}
              >
                {selectedIds.includes(bike.id) && (
                  <div className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
                    {selectedIds.indexOf(bike.id) + 1}
                  </div>
                )}
                <BikeCard bike={bike} />
              </div>
            ) : (
              <BikeCard key={bike.id} bike={bike} />
            )
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bike className="h-12 w-12" />}
          title="No bikes in your garage"
          description="Add your first bike to start tracking your rides and service history."
          action={
            <Link href="/bikes/garage/new">
              <Button>Add Your First Bike</Button>
            </Link>
          }
        />
      )}

      {compareMode && (
        <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
          Select 2 or 3 bikes to compare. {selectedIds.length < 2 ? `Select ${2 - selectedIds.length} more.` : 'Ready to compare!'}
        </p>
      )}
    </div>
  )
}
```

**Note:** If `Button` does not accept `variant="outline"` or `size="sm"` props, check `src/ui/components/Button.tsx` and adjust accordingly. If those props don't exist, replace with appropriate className-based buttons matching the existing style.

- [ ] **Step 2: Check Button component props**

```bash
grep -n "variant\|size\|outline" /Users/kylewarner/Documents/ride-mtb/src/ui/components/Button.tsx | head -20
```

If `Button` doesn't support `variant="outline"` or `size="sm"`, update the GarageView header buttons to use inline className buttons that match the existing style in the file. The Stats and Compare buttons can look like:

```tsx
<Link href="/bikes/garage/stats">
  <button className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]">
    <BarChart2 className="h-4 w-4" />
    Stats
  </button>
</Link>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "GarageView" | head -10
```
Expected: No errors

- [ ] **Step 4: Run all tests to confirm no regressions**

```bash
npx vitest run --reporter=verbose 2>&1 | grep -E "Tests |Test Files"
```
Expected: 240 passed (same as baseline), 2 pre-existing failures

- [ ] **Step 5: Commit**

```bash
git add src/modules/bikes/components/garage/GarageView.tsx
git commit -m "feat(bikes): add stats link and compare mode to GarageView"
```

---

## Final Verification

- [ ] **Run full test suite one last time**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -5
```
Expected: ≥240 tests passing. Pre-existing failures (addComponent success path, shops/submitShopReview, creators/videos) are acceptable.

- [ ] **Check TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```
Expected: No new type errors from files touched in this plan

- [ ] **Verify new routes exist**

```bash
ls src/app/bikes/garage/stats/ src/app/bikes/garage/compare/
```
Expected: `page.tsx` and `StatsClient.tsx` in stats/, `page.tsx` in compare/
