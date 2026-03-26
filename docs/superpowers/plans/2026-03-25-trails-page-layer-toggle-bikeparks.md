# Trails Page + Layer Toggle + Bike Parks Query

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/trails` landing page to show a compact hero + systems grouped by state, make the map layer toggle visually interactive with pill-style buttons, and expand the bike parks Overpass query to return real results.

**Architecture:** Three independent changes to three separate files — no shared state, no new DB queries, no new routes. The trails page groups existing `TrailSystemSummary[]` data by `state` field on the server. The layer toggle replaces its visual styling only (same props interface). The sync script updates one query string.

**Tech Stack:** Next.js 15 App Router, React, Tailwind CSS v4, Node.js (sync script)

---

## File Map

| File | Change |
|------|--------|
| `src/app/trails/page.tsx` | Replace hero + flat grid with compact hero + state-grouped sections |
| `src/modules/map/components/LayerToggle.tsx` | Replace legend-style rows with pill/chip toggle buttons |
| `scripts/sync-parks.mjs` | Expand BIKEPARK Overpass query with broader tag coverage |

---

### Task 1: Trails page — state-grouped layout

**Files:**
- Modify: `src/app/trails/page.tsx`

Context: `getTrailSystems()` returns `TrailSystemSummary[]`. Each has `state: string | null`. We group by state on the server, sort groups by system count descending. Systems with no state go in an "Other" group rendered last. `SystemCard` is already imported and works as-is — no changes needed.

- [ ] **Step 1: Replace the page content**

Replace the entire `src/app/trails/page.tsx` with:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Map, Compass } from 'lucide-react'
import { SystemCard } from '@/modules/trails'
import { Button } from '@/ui/components'
// eslint-disable-next-line no-restricted-imports
import { getTrailSystems } from '@/modules/trails/lib/queries'

export const metadata: Metadata = {
  title: 'Trails | Ride MTB',
  description:
    'Explore mountain bike trail systems, view maps, and find your next ride.',
}

export default async function TrailsPage() {
  const systems = await getTrailSystems()

  // Group by state, sort groups by count descending, null state → "Other" at end
  const grouped = new Map<string, typeof systems>()
  for (const s of systems) {
    const key = s.state ?? '__other__'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(s)
  }
  const sortedGroups = [...grouped.entries()]
    .sort(([aKey, aList], [bKey, bList]) => {
      if (aKey === '__other__') return 1
      if (bKey === '__other__') return -1
      return bList.length - aList.length
    })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Compact hero */}
      <section className="mb-10">
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
          Trail Systems
        </h1>
        <p className="mb-5 text-[var(--color-text-muted)]">
          Mountain bike trail systems across the US — browse by state or explore the map.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/trails/map">
            <Button size="sm">
              <Map className="h-4 w-4" />
              Trail Map
            </Button>
          </Link>
          <Link href="/trails/explore">
            <Button variant="secondary" size="sm">
              <Compass className="h-4 w-4" />
              Browse All
            </Button>
          </Link>
        </div>
      </section>

      {/* State-grouped sections */}
      {sortedGroups.length > 0 ? (
        <div className="space-y-10">
          {sortedGroups.map(([stateKey, stateSystems]) => {
            const label = stateKey === '__other__' ? 'Other' : stateKey
            return (
              <section key={stateKey}>
                <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
                  {label}
                  <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                    · {stateSystems.length} {stateSystems.length === 1 ? 'system' : 'systems'}
                  </span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {stateSystems.map((system) => (
                    <SystemCard key={system.id} system={system} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          No trail systems available yet.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx next build 2>&1 | tail -20
```

Expected: no TypeScript errors on `trails/page.tsx`. Warnings about other pages are fine.

- [ ] **Step 3: Commit**

```bash
git add src/app/trails/page.tsx
git commit -m "feat(trails): group systems by state on landing page"
```

---

### Task 2: Layer toggle — pill/chip interactive buttons

**Files:**
- Modify: `src/modules/map/components/LayerToggle.tsx`

Context: Current component renders `<label>` rows with a hidden checkbox and a colored dot. The visual problem is it looks like a legend — nothing communicates interactivity. Replace the rows with pill buttons: filled+opaque when active, outlined+dimmed+strikethrough when inactive. Same `LayerToggleProps` interface — no callers need to change.

- [ ] **Step 1: Replace the component**

Replace the entire `src/modules/map/components/LayerToggle.tsx` with:

```tsx
'use client'

import type { LayerName } from '../types'

const LAYER_COLORS: Record<LayerName, string> = {
  trails: '#16a34a',
  events: '#ef4444',
  coaching: '#3b82f6',
  skateparks: '#f97316',
  pumptracks: '#14b8a6',
  bikeparks: '#8b5cf6',
}

const LAYER_LABELS: Record<LayerName, string> = {
  trails: 'Trails',
  events: 'Events',
  coaching: 'Coaching',
  skateparks: 'Skateparks',
  pumptracks: 'Pump Tracks',
  bikeparks: 'Bike Parks',
}

interface LayerToggleProps {
  availableLayers: LayerName[]
  activeLayers: Set<LayerName>
  onToggle: (layer: LayerName) => void
}

export function LayerToggle({ availableLayers, activeLayers, onToggle }: LayerToggleProps) {
  return (
    <div className="absolute left-2 top-24 z-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-md">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Layers
      </p>
      <div className="flex flex-col gap-1.5">
        {availableLayers.map((layer) => {
          const active = activeLayers.has(layer)
          const color = LAYER_COLORS[layer]
          return (
            <button
              key={layer}
              type="button"
              onClick={() => onToggle(layer)}
              style={
                active
                  ? { backgroundColor: color, borderColor: color, color: '#fff' }
                  : { borderColor: color, color: '#9ca3af' }
              }
              className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity"
            >
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: active ? '#fff' : color }}
              />
              <span style={active ? {} : { textDecoration: 'line-through' }}>
                {LAYER_LABELS[layer]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit 2>&1 | grep -i "LayerToggle\|layer-toggle" | head -10
```

Expected: no errors mentioning LayerToggle.

- [ ] **Step 3: Commit**

```bash
git add src/modules/map/components/LayerToggle.tsx
git commit -m "feat(map): replace legend-style layer toggle with interactive pill buttons"
```

---

### Task 3: Bike parks — broader Overpass query

**Files:**
- Modify: `scripts/sync-parks.mjs` (lines 21–26)

Context: The current `BIKEPARK` query uses only `leisure=bikepark` which is almost never used in US OSM data. `sport=mountain_biking` is the most reliable tag for dedicated MTB bike parks in North America. A name filter on `sport=cycling` catches named parks like "Eagle Bike Park" without pulling in road cycling routes. Avoid including "pump track" in the name filter — those are already captured by the PUMPTRACK query and share osmIds.

- [ ] **Step 1: Replace the BIKEPARK query entry**

In `scripts/sync-parks.mjs`, find the BIKEPARK entry in the `QUERIES` array and replace it:

```js
  {
    type: 'BIKEPARK',
    label: 'Bike Parks',
    query: `[out:json][timeout:60];(
      way["leisure"="bikepark"](${US_BBOX});
      relation["leisure"="bikepark"](${US_BBOX});
      way["sport"="mountain_biking"](${US_BBOX});
      relation["sport"="mountain_biking"](${US_BBOX});
      way["sport"="cycling"]["name"~"bike park|bikepark|jump park|skills park|dirt jump",i](${US_BBOX});
      relation["sport"="cycling"]["name"~"bike park|bikepark|jump park|skills park|dirt jump",i](${US_BBOX});
    );out center tags;`,
  },
```

Note: the backtick template literal wraps the entire multi-line query — keep `${US_BBOX}` as-is (it interpolates correctly at runtime since this is a JS module).

- [ ] **Step 2: Run the sync for bike parks only (dry run check)**

Temporarily comment out the SKATEPARK and PUMPTRACK entries in `QUERIES` so only BIKEPARK runs, then execute:

```bash
cd /Users/kylewarner/Documents/ride-mtb
node scripts/sync-parks.mjs 2>&1 | tail -20
```

Expected: `Got N elements from OSM` with N > 0 for Bike Parks. If N is still 0, try querying just `sport=mountain_biking` in isolation at overpass-turbo.eu to verify the tag works.

- [ ] **Step 3: Restore the full QUERIES array**

Uncomment SKATEPARK and PUMPTRACK entries.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-parks.mjs
git commit -m "fix(parks): expand bike parks OSM query to use sport=mountain_biking and name filter"
```

---

## How to verify all three

```bash
# Dev server
cd /Users/kylewarner/Documents/ride-mtb
npm run dev

# Check:
# 1. /trails — compact hero, systems grouped under state headers like "Colorado · 4 systems"
# 2. /parks (or /trails/map) — layer toggle shows pill buttons; click one → it goes outlined+strikethrough
# 3. After sync — /parks map shows bike park pins (purple) alongside skateparks and pump tracks
```
