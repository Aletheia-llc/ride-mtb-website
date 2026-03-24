# Events Migration + Unified Map Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the full events module into the monolith, build a shared `UnifiedMap` component with layer toggles for trails/events/coaching, and add coaching clinics as a schedulable entity with map support.

**Architecture:** Schema first (all workstreams depend on it), then UnifiedMap infrastructure, then wire the existing `/trails/map` page, then events migration, then coaching clinics. The Fantasy `EventStatus` enum conflict must be resolved in Task 1 before any other schema changes.

**Tech Stack:** Next.js 15.5.12, Prisma v7 (PrismaPg adapter, import from `@/generated/prisma/client`), PostgreSQL (Supabase), Tailwind CSS v4, Mapbox GL JS v3, NextAuth v5, next-intl, Cal.com

---

## File Map

**New files (create):**
- `src/modules/map/types/index.ts`
- `src/modules/map/hooks/useMapLayers.ts`
- `src/modules/map/components/MapStyleSelector.tsx` (moved from trails)
- `src/modules/map/components/LayerToggle.tsx`
- `src/modules/map/components/UnifiedMap.tsx`
- `src/modules/map/components/layers/TrailsLayer.tsx`
- `src/modules/map/components/layers/EventsLayer.tsx`
- `src/modules/map/components/layers/CoachesLayer.tsx`
- `src/modules/map/components/popups/TrailSystemPopup.tsx`
- `src/modules/map/components/popups/EventPopup.tsx`
- `src/modules/map/components/popups/CoachPopup.tsx`
- `src/modules/map/index.ts`
- `src/app/api/trails/map/route.ts`
- `src/app/api/events/map/route.ts`
- `src/app/api/coaching/map/route.ts`
- `src/app/api/events/search/route.ts`
- `src/app/api/events/near/route.ts`
- `src/app/api/geocode/route.ts`
- `src/app/api/import/route.ts`
- `src/app/api/cron/events/reminders/route.ts`
- `src/app/api/cron/events/complete-past/route.ts`
- `src/app/api/cron/events/geocode/route.ts`
- `src/app/events/map/page.tsx`
- `src/app/events/search/page.tsx`
- `src/app/events/near-me/page.tsx`
- `src/app/events/my-events/page.tsx`
- `src/app/events/preferences/page.tsx`
- `src/app/events/submit/page.tsx`
- `src/app/admin/submissions/page.tsx`
- `src/app/admin/import/page.tsx`
- `src/app/admin/organizers/page.tsx`
- `src/app/coaching/map/page.tsx`
- `src/app/coaching/clinics/page.tsx`
- `src/app/coaching/clinics/[slug]/page.tsx`
- `src/app/coaching/dashboard/clinics/page.tsx`
- `src/app/coaching/dashboard/clinics/new/page.tsx`
- `src/app/coaching/dashboard/clinics/[id]/edit/page.tsx`
- `src/modules/events/actions/preferences.ts`
- `src/modules/events/actions/submit.ts`
- `src/modules/events/actions/ical.ts`
- `src/modules/events/actions/admin.ts`
- `src/modules/events/lib/import/dedup.ts`
- `src/modules/events/lib/import/bikereg.ts`
- `src/modules/events/lib/import/usac.ts`
- `src/modules/events/components/EventFilterBar.tsx`
- `src/modules/events/components/EventSplitView.tsx`
- `src/modules/events/components/NearMePrompt.tsx`
- `src/modules/events/components/SearchBar.tsx`
- `src/modules/events/components/EventHero.tsx`
- `src/modules/events/components/EventInfoGrid.tsx`
- `src/modules/events/components/EventTypeBadge.tsx`
- `src/modules/events/components/DifficultyBadge.tsx`
- `src/modules/events/components/IcalDownload.tsx`
- `src/modules/events/components/RelatedEvents.tsx`
- `src/modules/events/components/ResultsBanner.tsx`
- `src/modules/events/components/AttendeeRow.tsx`
- `src/modules/events/components/MyEventsList.tsx`
- `src/modules/events/components/PastEventCard.tsx`
- `src/modules/events/components/SubmitEventForm.tsx`
- `src/modules/events/components/LocationPicker.tsx`
- `src/modules/events/components/SubmissionQueue.tsx`
- `src/modules/events/components/ImportManager.tsx`
- `src/modules/events/components/OrganizerManager.tsx`
- `src/modules/coaching/components/CoachingClinicCard.tsx`
- `src/modules/coaching/components/CoachingClinicForm.tsx`
- `src/modules/coaching/components/ClinicList.tsx`
- `src/modules/coaching/lib/queries.ts` (clinic queries)
- `src/modules/coaching/actions/clinics.ts`
- `scripts/geocode-coaches.ts`

**Modified files:**
- `prisma/schema.prisma` (Tasks 1–4)
- `src/modules/trails/components/SystemClusterMap.tsx` → deleted (Task 11)
- `src/modules/trails/components/SystemClusterMapDynamic.tsx` → deleted (Task 11)
- `src/modules/trails/components/MapStyleSelector.tsx` → deleted, moved to map module (Task 7)
- `src/modules/trails/components/index.ts` (remove SystemClusterMapDynamic export, Task 11)
- `src/app/trails/map/page.tsx` (use UnifiedMapDynamic, Task 11)
- `src/modules/events/lib/queries.ts` (expand, Task 12)
- `src/modules/events/types/index.ts` (expand, Task 12)
- `src/modules/events/actions/createOrganizerProfile.ts` (orgName→name, Task 3)
- `src/modules/events/components/OrganizerDashboard.tsx` (orgName→name, Task 3)
- `src/app/events/organizer/setup/page.tsx` (orgName→name, Task 3)
- `src/modules/fantasy/types/index.ts` (EventStatus→FantasyEventStatus, Task 1)
- `src/modules/fantasy/actions/admin/manageEvent.ts` (EventStatus→FantasyEventStatus, Task 1)
- `vercel.json` (add 3 crons, Task 19)

---

## Phase 1 — Schema

### Task 1: Resolve EventStatus Naming Conflict + Remove EventTypeEnum

**Why first:** The Fantasy module already has `enum EventStatus` (values: `upcoming`, `roster_open`, `locked`, `results_pending`, `scored`). We need a new `EventStatus` for event lifecycle. This rename must happen before any other schema changes.

**Files:**
- Modify: `prisma/schema.prisma:2861` (rename Fantasy EventStatus → FantasyEventStatus)
- Modify: `prisma/schema.prisma:895` (remove `eventTypeEnum EventTypeEnum?` from Event model)
- Modify: `prisma/schema.prisma:1846` (remove `EventTypeEnum` enum entirely)
- Modify: `src/modules/fantasy/types/index.ts`
- Modify: `src/modules/fantasy/actions/admin/manageEvent.ts`

- [ ] **Step 1: Rename Fantasy EventStatus in schema**

In `prisma/schema.prisma`, find the enum at line ~2861:
```prisma
// BEFORE:
enum EventStatus {
  upcoming
  roster_open
  locked
  results_pending
  scored

  @@map("EventStatus")
}
```
Change to:
```prisma
enum FantasyEventStatus {
  upcoming
  roster_open
  locked
  results_pending
  scored

  @@map("EventStatus")
}
```
Also update `FantasyEvent.status` field (line ~2532) from `EventStatus` to `FantasyEventStatus`:
```prisma
// BEFORE:
status           EventStatus       @default(upcoming)
// AFTER:
status           FantasyEventStatus @default(upcoming)
```

- [ ] **Step 2: Remove EventTypeEnum from Event model and schema**

In `prisma/schema.prisma`, remove the field from the Event model (line ~895):
```prisma
// Remove this line:
eventTypeEnum         EventTypeEnum?
```
Remove the entire enum block (line ~1846):
```prisma
// Remove this entire block:
enum EventTypeEnum {
  RACE
  ENDURO
  // ...all values...
}
```

- [ ] **Step 3: Update Fantasy TypeScript imports**

In `src/modules/fantasy/types/index.ts`, change:
```typescript
// BEFORE:
import { ..., EventStatus, ... } from '@/generated/prisma/client'
export { ..., EventStatus, ... }
```
To:
```typescript
// AFTER:
import { ..., FantasyEventStatus, ... } from '@/generated/prisma/client'
export { ..., FantasyEventStatus, ... }
```

In `src/modules/fantasy/actions/admin/manageEvent.ts`, replace all `EventStatus` references with `FantasyEventStatus`:
- Line ~151: `data: { status: status as EventStatus }` → `data: { status: status as FantasyEventStatus }`
- All type annotations using `EventStatus` → `FantasyEventStatus`

- [ ] **Step 4: Run migration**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma migrate dev --name "rename-fantasy-event-status-remove-event-type-enum"
```
Expected: Migration succeeds. The `@@map("EventStatus")` keeps the DB column name unchanged — no data migration needed.

- [ ] **Step 5: Regenerate client and verify**

```bash
npx prisma generate
```
Then verify TypeScript compiles:
```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: No errors referencing `EventStatus` or `EventTypeEnum`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/modules/fantasy/
git commit -m "chore(schema): rename FantasyEventStatus, remove EventTypeEnum"
```

---

### Task 2: Add EventStatus Enum + Expand EventType + Add Event Fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new EventStatus enum**

In `prisma/schema.prisma`, add after the existing ContentStatus enum (or near other event-related enums):
```prisma
enum EventStatus {
  draft
  pending_review
  published
  cancelled
  postponed
  completed
}
```

- [ ] **Step 2: Migrate Event.status from ContentStatus to EventStatus**

Find the Event model `status` field and change:
```prisma
// BEFORE:
status               ContentStatus  @default(published)
// AFTER:
status               EventStatus    @default(published)
```

- [ ] **Step 3: Expand EventType enum**

Find `enum EventType` and replace with:
```prisma
enum EventType {
  // Preserved from monolith (existing rows use these)
  group_ride
  race
  skills_clinic
  trail_work
  social
  demo_day
  other

  // Added from standalone repo
  race_xc
  race_enduro
  race_dh
  race_marathon
  race_other
  clinic
  camp
  expo
  bike_park_day
  virtual_challenge
}
```

- [ ] **Step 4: Add new fields to Event model**

Add these fields to the Event model (after existing fields, before closing brace):
```prisma
  // Location structured
  venueName            String?
  address              String?
  city                 String?
  state                String?
  zipCode              String?
  country              String    @default("US")

  // Rich metadata
  shortDescription     String?
  coverImageUrl        String?
  tags                 String[]  @default([])
  difficulty           String?

  // Virtual events
  isVirtual            Boolean   @default(false)
  virtualPlatform      String?
  virtualUrl           String?

  // Time
  startTime            String?
  endTime              String?
  timezone             String?
  isAllDay             Boolean   @default(false)

  // Counters (denormalized)
  viewCount            Int       @default(0)
  commentCount         Int       @default(0)
  rsvpCount            Int       @default(0)

  // Import tracking
  importSource         String?
  externalId           String?
```

Also add index for dedup queries in the Event model:
```prisma
  @@index([importSource, externalId])
```

- [ ] **Step 5: Add UserEventPreference model**

Add as a new model (near other user-related models):
```prisma
model UserEventPreference {
  id              String    @id @default(cuid())
  userId          String    @unique
  homeLatitude    Decimal?  @db.Decimal(10, 7)
  homeLongitude   Decimal?  @db.Decimal(10, 7)
  searchRadius    Int       @default(100)
  followedTypes   String[]  @default([])
  newEventAlerts  Boolean   @default(true)
  reminderDays    Int       @default(3)
  resultsAlerts   Boolean   @default(true)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_event_preferences")
}
```

Also add `eventPreference UserEventPreference?` to the User model relation list.

- [ ] **Step 6: Run migration**

```bash
npx prisma migrate dev --name "add-event-status-expand-event-type-add-event-fields"
```
Expected: Migration applies. Existing `Event.status` rows have their ContentStatus values mapped — since both ContentStatus and EventStatus share `draft`/`published`/`archived`/`draft`, Prisma handles this with a cast migration. Verify the migration SQL before confirming.

- [ ] **Step 7: Regenerate and type-check**

```bash
npx prisma generate && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add EventStatus enum, expand EventType, add Event fields"
```

---

### Task 3: OrganizerProfile Field Alignment + CoachProfile Geocoding Fields

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/modules/events/actions/createOrganizerProfile.ts`
- Modify: `src/modules/events/components/OrganizerDashboard.tsx`
- Modify: `src/app/events/organizer/setup/page.tsx`

- [ ] **Step 1: Update OrganizerProfile in schema**

Find `model OrganizerProfile` and:
1. Rename `orgName String` → `name String`
2. Add missing fields:
```prisma
  description    String?
  contactEmail   String?
  socialLinks    String[]  @default([])
  isActive       Boolean   @default(true)
```

Add CoachProfile geocoding fields — find `model CoachProfile` and add:
```prisma
  latitude   Float?
  longitude  Float?
  clinics    CoachingClinic[]
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name "organizer-profile-align-coach-geo"
```
Expected: `orgName` column renamed to `name`, new columns added. Existing organizer rows keep their values (column rename, not data loss).

- [ ] **Step 3: Update createOrganizerProfile.ts**

```typescript
// src/modules/events/actions/createOrganizerProfile.ts
// Change: orgName: z.string()... → name: z.string()...
// Change: data: { orgName: ... } → data: { name: ... }
```

- [ ] **Step 4: Update OrganizerDashboard.tsx**

```typescript
// src/modules/events/components/OrganizerDashboard.tsx
// Change type: { orgName: string } → { name: string }
// Change render: {organizer.orgName} → {organizer.name}
```

- [ ] **Step 5: Update organizer setup page**

```tsx
// src/app/events/organizer/setup/page.tsx
// Change: <input name="orgName" ... /> → <input name="name" ... />
```

- [ ] **Step 6: Regenerate and type-check**

```bash
npx prisma generate && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/modules/events/
git commit -m "feat(schema): align OrganizerProfile fields, add CoachProfile geocoding"
```

---

### Task 4: Add CoachingClinic Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add CoachingClinic model**

```prisma
model CoachingClinic {
  id          String       @id @default(cuid())
  coachId     String
  slug        String       @unique
  title       String
  description String?      @db.Text
  startDate   DateTime
  endDate     DateTime?
  location    String
  latitude    Float?
  longitude   Float?
  capacity    Int?
  costCents   Int?
  isFree      Boolean      @default(false)
  calcomLink  String?
  status      EventStatus  @default(published)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  coach       CoachProfile @relation(fields: [coachId], references: [id], onDelete: Cascade)

  @@index([startDate, status])
  @@index([latitude, longitude])
  @@map("coaching_clinics")
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name "add-coaching-clinic"
```

- [ ] **Step 3: Regenerate and type-check**

```bash
npx prisma generate && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add CoachingClinic model"
```

---

### Task 5: Add Environment Variables

**Files:**
- `.env.local` (local only, not committed)
- Vercel project env vars (documented here, set manually)

- [ ] **Step 1: Add MAPBOX_ACCESS_TOKEN to .env.local**

```bash
# Add to .env.local (server-side secret, NOT the public token):
# MAPBOX_ACCESS_TOKEN=sk.ey...
echo "# Add to .env.local:" && echo "MAPBOX_ACCESS_TOKEN=<your-secret-token>"
```

This is distinct from `NEXT_PUBLIC_MAPBOX_TOKEN`. The public token is used client-side in map components. The secret token is used server-side in `/api/geocode`, cron geocoding, and `scripts/geocode-coaches.ts`.

- [ ] **Step 2: Verify both tokens exist locally**

```bash
grep "MAPBOX" .env.local
```
Expected: Both `NEXT_PUBLIC_MAPBOX_TOKEN` and `MAPBOX_ACCESS_TOKEN` present.

- [ ] **Step 3: Document for Vercel**

Add `MAPBOX_ACCESS_TOKEN` to Vercel project env vars (Production + Preview, server-side only — do NOT prefix with NEXT_PUBLIC).

- [ ] **Step 4: Commit reminder note**

```bash
git add .env.local.example 2>/dev/null || true
git commit -m "chore: document MAPBOX_ACCESS_TOKEN env var requirement" --allow-empty
```

---

## Phase 2 — UnifiedMap Infrastructure

### Task 6: Map Module Types + useMapLayers Hook

**Files:**
- Create: `src/modules/map/types/index.ts`
- Create: `src/modules/map/hooks/useMapLayers.ts`
- Test: `src/modules/map/hooks/useMapLayers.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/modules/map/hooks/useMapLayers.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMapLayers } from './useMapLayers'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useMapLayers', () => {
  beforeEach(() => localStorageMock.clear())

  it('uses defaultLayers when no stored state', () => {
    const { result } = renderHook(() =>
      useMapLayers(['trails'], ['trails', 'events', 'coaching'])
    )
    expect(result.current.activeLayers.has('trails')).toBe(true)
    expect(result.current.activeLayers.has('events')).toBe(false)
  })

  it('restores persisted layers from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(['events', 'coaching']))
    const { result } = renderHook(() =>
      useMapLayers(['trails'], ['trails', 'events', 'coaching'])
    )
    expect(result.current.activeLayers.has('events')).toBe(true)
    expect(result.current.activeLayers.has('trails')).toBe(false)
  })

  it('toggles a layer and persists to localStorage', () => {
    const { result } = renderHook(() =>
      useMapLayers(['trails'], ['trails', 'events', 'coaching'])
    )
    act(() => result.current.toggleLayer('events'))
    expect(result.current.activeLayers.has('events')).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'ride-mtb-map-layers',
      expect.stringContaining('events')
    )
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/modules/map/hooks/useMapLayers.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create types/index.ts**

```typescript
// src/modules/map/types/index.ts
export type LayerName = 'trails' | 'events' | 'coaching'

export interface TrailSystemPin {
  id: string
  slug: string
  name: string
  city: string
  state: string
  latitude: number
  longitude: number
  trailCount: number
  averageRating?: number | null
}

export interface EventPin {
  id: string
  slug: string
  title: string
  startDate: string
  eventType: string
  latitude: number
  longitude: number
  rsvpCount: number
}

export interface CoachPin {
  id: string
  name: string
  latitude: number
  longitude: number
  specialties: string[]
  hourlyRate?: number | null
  calcomLink?: string | null
}

export interface ClinicPin {
  id: string
  slug: string
  title: string
  startDate: string
  latitude: number
  longitude: number
  costCents?: number | null
  isFree: boolean
  calcomLink?: string | null
  coachName: string
}

export interface CoachingMapData {
  coaches: CoachPin[]
  clinics: ClinicPin[]
}
```

- [ ] **Step 4: Create useMapLayers.ts**

```typescript
// src/modules/map/hooks/useMapLayers.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { LayerName } from '../types'

const STORAGE_KEY = 'ride-mtb-map-layers'

export function useMapLayers(
  defaultLayers: LayerName[],
  availableLayers: LayerName[]
) {
  const [activeLayers, setActiveLayers] = useState<Set<LayerName>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as LayerName[]
        const valid = parsed.filter((l) => availableLayers.includes(l))
        if (valid.length > 0) return new Set(valid)
      }
    } catch {}
    return new Set(defaultLayers)
  })

  const toggleLayer = useCallback((layer: LayerName) => {
    setActiveLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layer)) {
        next.delete(layer)
      } else {
        next.add(layer)
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }, [])

  return { activeLayers, toggleLayer }
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/modules/map/hooks/useMapLayers.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/modules/map/
git commit -m "feat(map): add map module types and useMapLayers hook"
```

---

### Task 7: Move MapStyleSelector + Create LayerToggle

**Files:**
- Create: `src/modules/map/components/MapStyleSelector.tsx` (moved)
- Create: `src/modules/map/components/LayerToggle.tsx`
- Modify: `src/modules/trails/components/MapStyleSelector.tsx` (re-export from map module)

- [ ] **Step 1: Create new MapStyleSelector in map module**

Copy content from `src/modules/trails/components/MapStyleSelector.tsx` to `src/modules/map/components/MapStyleSelector.tsx` — same code, new location.

- [ ] **Step 2: Update trails MapStyleSelector to re-export**

```typescript
// src/modules/trails/components/MapStyleSelector.tsx
// Replace file content with:
export { MapStyleSelector, MAPBOX_STYLES, getMapboxStyleUrl } from '@/modules/map/components/MapStyleSelector'
export type { MapStyle } from '@/modules/map/components/MapStyleSelector'
```

This keeps existing trails imports working without changing them.

- [ ] **Step 3: Create LayerToggle**

```typescript
// src/modules/map/components/LayerToggle.tsx
'use client'

import type { LayerName } from '../types'

const LAYER_COLORS: Record<LayerName, string> = {
  trails: '#16a34a',
  events: '#ef4444',
  coaching: '#3b82f6',
}

const LAYER_LABELS: Record<LayerName, string> = {
  trails: 'Trails',
  events: 'Events',
  coaching: 'Coaching',
}

interface LayerToggleProps {
  availableLayers: LayerName[]
  activeLayers: Set<LayerName>
  onToggle: (layer: LayerName) => void
}

export function LayerToggle({ availableLayers, activeLayers, onToggle }: LayerToggleProps) {
  return (
    <div className="absolute left-2 top-24 z-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-2 shadow-md">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Layers
      </p>
      <div className="space-y-1">
        {availableLayers.map((layer) => (
          <label key={layer} className="flex cursor-pointer items-center gap-2 text-sm">
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: LAYER_COLORS[layer] }}
            />
            <input
              type="checkbox"
              checked={activeLayers.has(layer)}
              onChange={() => onToggle(layer)}
              className="sr-only"
            />
            <span className={activeLayers.has(layer) ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}>
              {LAYER_LABELS[layer]}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/map/components/ src/modules/trails/components/MapStyleSelector.tsx
git commit -m "feat(map): move MapStyleSelector to map module, add LayerToggle"
```

---

### Task 8: UnifiedMap Component

**Files:**
- Create: `src/modules/map/components/UnifiedMap.tsx`
- Create: `src/modules/map/index.ts`

- [ ] **Step 1: Create UnifiedMap.tsx**

```typescript
// src/modules/map/components/UnifiedMap.tsx
'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import dynamic from 'next/dynamic'
import { MapStyleSelector, MAPBOX_STYLES } from './MapStyleSelector'
import type { MapStyle } from './MapStyleSelector'
import { LayerToggle } from './LayerToggle'
import { useMapLayers } from '../hooks/useMapLayers'
import type { LayerName } from '../types'

interface UnifiedMapProps {
  defaultLayers: LayerName[]
  availableLayers: LayerName[]
  className?: string
  center?: [number, number]
  zoom?: number
}

export function UnifiedMap({
  defaultLayers,
  availableLayers,
  className = '',
  center = [-98.5, 39.8],
  zoom = 4,
}: UnifiedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('standard')
  const [mapLoaded, setMapLoaded] = useState(false)
  const { activeLayers, toggleLayer } = useMapLayers(defaultLayers, availableLayers)

  useEffect(() => {
    if (!containerRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLES[mapStyle],
      center,
      zoom,
      antialias: true,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.on('load', () => {
      setMapLoaded(true)
    })

    mapRef.current = map
    return () => { map.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStyleChange = useCallback((newStyle: MapStyle) => {
    setMapStyle(newStyle)
    const map = mapRef.current
    if (!map) return
    map.setStyle(MAPBOX_STYLES[newStyle])
    map.once('style.load', () => {
      setMapLoaded(false)
      setTimeout(() => setMapLoaded(true), 100)
      if (newStyle === '3d' || newStyle === '3d-satellite') {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          })
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
        map.easeTo({ pitch: 60 })
      } else {
        map.setTerrain(null)
        map.easeTo({ pitch: 0 })
      }
    })
  }, [])

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      {availableLayers.length > 1 && (
        <LayerToggle
          availableLayers={availableLayers}
          activeLayers={activeLayers}
          onToggle={toggleLayer}
        />
      )}
      <MapStyleSelector current={mapStyle} onChange={handleStyleChange} />
      {/* Layer components mount here when map is ready */}
      {mapLoaded && mapRef.current && availableLayers.includes('trails') && activeLayers.has('trails') && (
        <TrailsLayerLazy map={mapRef.current} />
      )}
      {mapLoaded && mapRef.current && availableLayers.includes('events') && activeLayers.has('events') && (
        <EventsLayerLazy map={mapRef.current} />
      )}
      {mapLoaded && mapRef.current && availableLayers.includes('coaching') && activeLayers.has('coaching') && (
        <CoachesLayerLazy map={mapRef.current} />
      )}
    </div>
  )
}
```

Note: `TrailsLayerLazy`, `EventsLayerLazy`, `CoachesLayerLazy` are forward-declared — they'll be wired in Task 9. For now, add placeholders:

```typescript
// Placeholder imports at top of UnifiedMap.tsx (replaced in Task 9):
const TrailsLayerLazy = (_props: { map: mapboxgl.Map }) => null
const EventsLayerLazy = (_props: { map: mapboxgl.Map }) => null
const CoachesLayerLazy = (_props: { map: mapboxgl.Map }) => null
```

- [ ] **Step 2: Create map module index**

```typescript
// src/modules/map/index.ts
import dynamic from 'next/dynamic'

export const UnifiedMapDynamic = dynamic(
  () => import('./components/UnifiedMap').then((m) => m.UnifiedMap),
  { ssr: false }
)

export type { LayerName } from './types'
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/map/
git commit -m "feat(map): add UnifiedMap component and module index"
```

---

### Task 9: Layer Components + Map API Endpoints

**Files:**
- Create: `src/modules/map/components/layers/TrailsLayer.tsx`
- Create: `src/modules/map/components/layers/EventsLayer.tsx`
- Create: `src/modules/map/components/layers/CoachesLayer.tsx`
- Create: `src/app/api/trails/map/route.ts`
- Create: `src/app/api/events/map/route.ts`
- Create: `src/app/api/coaching/map/route.ts`
- Modify: `src/modules/map/components/UnifiedMap.tsx` (wire real layers)

- [ ] **Step 1: Create /api/trails/map**

```typescript
// src/app/api/trails/map/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function GET() {
  try {
    const result = await db.query(`
      SELECT id, slug, name, city, state, latitude, longitude,
             "averageRating",
             (SELECT COUNT(*) FROM trails WHERE "systemId" = trail_systems.id) AS "trailCount"
      FROM trail_systems
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY name
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/trails/map error:', error)
    return NextResponse.json({ error: 'Failed to fetch trail systems' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create /api/events/map**

```typescript
// src/app/api/events/map/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function GET() {
  try {
    const result = await db.query(`
      SELECT id, slug, title, "startDate", "eventType", latitude, longitude, "rsvpCount"
      FROM events
      WHERE status = 'published'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND "startDate" >= NOW()
      ORDER BY "startDate"
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/events/map error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create /api/coaching/map**

```typescript
// src/app/api/coaching/map/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function GET() {
  try {
    const [coachesResult, clinicsResult] = await Promise.all([
      db.query(`
        SELECT cp.id, u.name, cp.latitude, cp.longitude,
               cp.specialties, cp."hourlyRate", cp."calcomLink"
        FROM coach_profiles cp
        JOIN users u ON u.id = cp."userId"
        WHERE cp.latitude IS NOT NULL AND cp.longitude IS NOT NULL
          AND cp."isActive" = true
      `),
      db.query(`
        SELECT cc.id, cc.slug, cc.title, cc."startDate",
               cc.latitude, cc.longitude, cc."costCents", cc."isFree", cc."calcomLink",
               u.name AS "coachName"
        FROM coaching_clinics cc
        JOIN coach_profiles cp ON cp.id = cc."coachId"
        JOIN users u ON u.id = cp."userId"
        WHERE cc.status = 'published'
          AND cc."startDate" >= NOW()
          AND cc.latitude IS NOT NULL
          AND cc.longitude IS NOT NULL
        ORDER BY cc."startDate"
      `),
    ])
    return NextResponse.json({
      coaches: coachesResult.rows,
      clinics: clinicsResult.rows,
    })
  } catch (error) {
    console.error('GET /api/coaching/map error:', error)
    return NextResponse.json({ error: 'Failed to fetch coaching data' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create TrailsLayer**

```typescript
// src/modules/map/components/layers/TrailsLayer.tsx
'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { TrailSystemPin } from '../../types'

interface TrailsLayerProps {
  map: mapboxgl.Map
}

export function TrailsLayer({ map }: TrailsLayerProps) {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    fetch('/api/trails/map')
      .then((r) => r.json())
      .then((pins: TrailSystemPin[]) => {
        if (!map || map._removed) return

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: pins.map((p) => ({
            type: 'Feature',
            properties: { id: p.id, slug: p.slug, name: p.name, city: p.city, state: p.state, trailCount: p.trailCount, rating: p.averageRating },
            geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
          })),
        }

        if (map.getSource('trails')) {
          (map.getSource('trails') as mapboxgl.GeoJSONSource).setData(geojson)
          return
        }

        map.addSource('trails', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 12, clusterRadius: 50 })
        map.addLayer({ id: 'trail-clusters', type: 'circle', source: 'trails', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#16a34a', 'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 10, 40], 'circle-opacity': 0.85 } })
        map.addLayer({ id: 'trail-cluster-count', type: 'symbol', source: 'trails', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 14 },
          paint: { 'text-color': '#ffffff' } })
        map.addLayer({ id: 'trail-pins', type: 'circle', source: 'trails', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#16a34a', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

        map.on('click', 'trail-pins', (e) => {
          const feature = e.features?.[0]
          if (!feature?.properties) return
          const { slug, name, city, state, trailCount, rating } = feature.properties
          new mapboxgl.Popup({ offset: 15, maxWidth: '220px' })
            .setHTML(`<div style="font-family:sans-serif;padding:4px 0">
              <strong style="font-size:14px">${name}</strong>
              <div style="font-size:12px;color:#666;margin-top:2px">${city}, ${state}</div>
              <div style="font-size:12px;margin-top:4px">${trailCount} trails${rating ? ` · ★ ${Number(rating).toFixed(1)}` : ''}</div>
              <a href="/trails/explore/${slug}" style="display:block;margin-top:8px;font-size:12px;color:#16a34a">Explore Trails →</a>
            </div>`)
            .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
            .addTo(map)
        })

        map.on('mouseenter', 'trail-pins', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'trail-pins', () => { map.getCanvas().style.cursor = '' })
        map.on('click', 'trail-clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['trail-clusters'] })
          const clusterId = features[0]?.properties?.cluster_id
          if (clusterId != null) {
            (map.getSource('trails') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null) return
              map.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom })
            })
          }
        })
      })
      .catch(console.error)

    return () => {
      if (!map || map._removed) return
      for (const layer of ['trail-clusters', 'trail-cluster-count', 'trail-pins']) {
        if (map.getLayer(layer)) map.removeLayer(layer)
      }
      if (map.getSource('trails')) map.removeSource('trails')
    }
  }, [map])

  return null
}
```

- [ ] **Step 5: Create EventsLayer**

```typescript
// src/modules/map/components/layers/EventsLayer.tsx
'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { EventPin } from '../../types'

const EVENT_TYPE_COLORS: Record<string, string> = {
  race: '#ef4444', race_xc: '#ef4444', race_enduro: '#ef4444',
  race_dh: '#ef4444', race_marathon: '#ef4444', race_other: '#ef4444',
  group_ride: '#22c55e',
  clinic: '#3b82f6', camp: '#3b82f6', skills_clinic: '#3b82f6',
  trail_work: '#f59e0b',
  social: '#a855f7', expo: '#a855f7', demo_day: '#a855f7', bike_park_day: '#a855f7',
}
const DEFAULT_COLOR = '#6b7280'

function getColor(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] ?? DEFAULT_COLOR
}

interface EventsLayerProps {
  map: mapboxgl.Map
}

export function EventsLayer({ map }: EventsLayerProps) {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    fetch('/api/events/map')
      .then((r) => r.json())
      .then((pins: EventPin[]) => {
        if (!map || map._removed) return

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: pins.map((p) => ({
            type: 'Feature',
            properties: { id: p.id, slug: p.slug, title: p.title, startDate: p.startDate, eventType: p.eventType, rsvpCount: p.rsvpCount, color: getColor(p.eventType) },
            geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
          })),
        }

        if (!map.getSource('events')) {
          map.addSource('events', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 10, clusterRadius: 40 })
          map.addLayer({ id: 'event-clusters', type: 'circle', source: 'events', filter: ['has', 'point_count'],
            paint: { 'circle-color': '#ef4444', 'circle-radius': ['step', ['get', 'point_count'], 18, 5, 26, 10, 36], 'circle-opacity': 0.85 } })
          map.addLayer({ id: 'event-cluster-count', type: 'symbol', source: 'events', filter: ['has', 'point_count'],
            layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 13 },
            paint: { 'text-color': '#ffffff' } })
          map.addLayer({ id: 'event-pins', type: 'circle', source: 'events', filter: ['!', ['has', 'point_count']],
            paint: { 'circle-color': ['get', 'color'], 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

          map.on('click', 'event-pins', (e) => {
            const feature = e.features?.[0]
            if (!feature?.properties) return
            const { slug, title, startDate, eventType, rsvpCount, color } = feature.properties
            const dateStr = new Date(startDate).toLocaleDateString()
            new mapboxgl.Popup({ offset: 15, maxWidth: '240px' })
              .setHTML(`<div style="font-family:sans-serif;padding:4px 0">
                <strong style="font-size:14px">${title}</strong>
                <div style="margin-top:4px"><span style="background:${color};color:#fff;border-radius:4px;padding:1px 6px;font-size:11px">${eventType.replace(/_/g, ' ')}</span></div>
                <div style="font-size:12px;color:#666;margin-top:4px">${dateStr} · ${rsvpCount} going</div>
                <a href="/events/${slug}" style="display:block;margin-top:8px;font-size:12px;color:#ef4444">View Event →</a>
              </div>`)
              .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
              .addTo(map)
          })
          map.on('mouseenter', 'event-pins', () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', 'event-pins', () => { map.getCanvas().style.cursor = '' })
        } else {
          (map.getSource('events') as mapboxgl.GeoJSONSource).setData(geojson)
        }
      })
      .catch(console.error)

    return () => {
      if (!map || map._removed) return
      for (const layer of ['event-clusters', 'event-cluster-count', 'event-pins']) {
        if (map.getLayer(layer)) map.removeLayer(layer)
      }
      if (map.getSource('events')) map.removeSource('events')
    }
  }, [map])

  return null
}
```

- [ ] **Step 6: Create CoachesLayer (abbreviated pattern)**

Create `src/modules/map/components/layers/CoachesLayer.tsx` following the same pattern as EventsLayer — fetch `/api/coaching/map`, add two sources (`coach-profiles` green circles, `coaching-clinics` blue squares), popups with cal.com links.

- [ ] **Step 7: Wire layers into UnifiedMap**

In `src/modules/map/components/UnifiedMap.tsx`, replace the placeholder layer declarations with real imports:
```typescript
import { TrailsLayer } from './layers/TrailsLayer'
import { EventsLayer } from './layers/EventsLayer'
import { CoachesLayer } from './layers/CoachesLayer'
```
Remove the placeholder `const TrailsLayerLazy = ...` lines and update the JSX to use the real components.

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 9: Commit**

```bash
git add src/modules/map/ src/app/api/trails/map/ src/app/api/events/map/ src/app/api/coaching/map/
git commit -m "feat(map): add TrailsLayer, EventsLayer, CoachesLayer + map API endpoints"
```

---

## Phase 3 — Wire /trails/map

### Task 10: Migrate /trails/map to UnifiedMap

**Files:**
- Modify: `src/app/trails/map/page.tsx`
- Modify: `src/modules/trails/components/index.ts` (remove old exports)
- Delete: `src/modules/trails/components/SystemClusterMap.tsx`
- Delete: `src/modules/trails/components/SystemClusterMapDynamic.tsx`

- [ ] **Step 1: Update /trails/map page**

```typescript
// src/app/trails/map/page.tsx
import { Suspense } from 'react'
import { UnifiedMapDynamic } from '@/modules/map'

export const metadata = {
  title: 'Trail Map | Ride MTB',
  description: 'View all mountain bike trails on an interactive map.',
}

export default function TrailMapPage() {
  return (
    <div className="h-[calc(100vh_-_var(--nav-height))]">
      <Suspense fallback={<div className="h-full bg-[var(--color-bg-secondary)]" />}>
        <UnifiedMapDynamic
          defaultLayers={['trails']}
          availableLayers={['trails', 'events', 'coaching']}
          className="h-full"
        />
      </Suspense>
    </div>
  )
}
```

Note: The old page fetched trail systems server-side and passed them as props. The new `TrailsLayer` self-fetches via `/api/trails/map` — no server-side data needed in the page component.

- [ ] **Step 2: Remove SystemClusterMap from trails components index**

In `src/modules/trails/components/index.ts`, remove the export line for `SystemClusterMapDynamic` (and `SystemClusterMap` if exported).

- [ ] **Step 3: Delete old cluster map files**

```bash
rm /Users/kylewarner/Documents/ride-mtb/src/modules/trails/components/SystemClusterMap.tsx
rm /Users/kylewarner/Documents/ride-mtb/src/modules/trails/components/SystemClusterMapDynamic.tsx 2>/dev/null || true
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: No errors. The trails map page no longer needs `getTrailSystems` or SystemClusterMap.

- [ ] **Step 5: Commit**

```bash
git add src/app/trails/map/ src/modules/trails/components/
git commit -m "feat(trails): migrate /trails/map to UnifiedMap, delete SystemClusterMap"
```

---

## Phase 4 — Events Migration

### Task 11: Expand Events Types + Queries

**Files:**
- Modify: `src/modules/events/types/index.ts`
- Modify: `src/modules/events/lib/queries.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/modules/events/lib/queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEventsForMap, searchEvents, getEventsNearLocation } from './queries'

vi.mock('@/lib/db/client', () => ({
  db: {
    query: vi.fn(),
  },
}))

import { db } from '@/lib/db/client'
const mockDb = vi.mocked(db)

describe('getEventsForMap', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns published future events with coordinates', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: '1', slug: 'test-race', title: 'Test Race', latitude: 40.0, longitude: -105.0, eventType: 'race', rsvpCount: 5 }],
    } as any)
    const result = await getEventsForMap()
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('test-race')
  })
})

describe('searchEvents', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns events matching query', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: '2', title: 'Enduro Race', slug: 'enduro-race', startDate: new Date(), eventType: 'race_enduro', status: 'published', city: 'Denver', state: 'CO' }],
    } as any)
    const result = await searchEvents({ query: 'enduro' })
    expect(result.events).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
npx vitest run src/modules/events/lib/queries.test.ts
```
Expected: FAIL — functions not exported.

- [ ] **Step 3: Expand types/index.ts**

Add to `src/modules/events/types/index.ts`:
```typescript
export type EventStatusType = 'draft' | 'pending_review' | 'published' | 'cancelled' | 'postponed' | 'completed'

export interface EventMapPin {
  id: string
  slug: string
  title: string
  startDate: Date
  eventType: string
  latitude: number
  longitude: number
  rsvpCount: number
}

export interface EventSearchResult {
  id: string
  slug: string
  title: string
  startDate: Date
  eventType: string
  status: string
  city: string | null
  state: string | null
  coverImageUrl: string | null
  isFree: boolean
  rsvpCount: number
}

export interface SearchEventsParams {
  query?: string
  eventType?: string
  startDate?: Date
  endDate?: Date
  isFree?: boolean
  cursor?: string
  limit?: number
}

export interface NearMeParams {
  latitude: number
  longitude: number
  radiusKm: number
  limit?: number
}

export interface UserEventPreferenceData {
  homeLatitude?: number | null
  homeLongitude?: number | null
  searchRadius: number
  followedTypes: string[]
  newEventAlerts: boolean
  reminderDays: number
  resultsAlerts: boolean
}
```

- [ ] **Step 4: Add new functions to queries.ts**

Add `getEventsForMap`, `searchEvents`, `getEventsNearLocation`, `getUserEventPreference`, `upsertUserEventPreference`, `getMyRsvps`, `getEventsNeedingGeocoding` to `src/modules/events/lib/queries.ts`. Follow the existing function patterns (raw `db.query` calls with typed return values).

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/modules/events/lib/queries.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/events/
git commit -m "feat(events): expand events types and queries for map, search, near-me"
```

---

### Task 12: Events API Routes

**Files:**
- Create: `src/app/api/events/search/route.ts`
- Create: `src/app/api/events/near/route.ts`
- Create: `src/app/api/geocode/route.ts`
- Create: `src/app/api/import/route.ts`

- [ ] **Step 1: Create /api/events/search**

```typescript
// src/app/api/events/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { searchEvents } from '@/modules/events/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const result = await searchEvents({
      query: searchParams.get('q') ?? undefined,
      eventType: searchParams.get('type') ?? undefined,
      isFree: searchParams.get('free') === 'true' ? true : undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/events/search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create /api/events/near**

```typescript
// src/app/api/events/near/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEventsNearLocation } from '@/modules/events/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const radius = Number(searchParams.get('radius') ?? '100')
    if (!lat || !lng) return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
    const events = await getEventsNearLocation({ latitude: lat, longitude: lng, radiusKm: radius })
    return NextResponse.json(events)
  } catch (error) {
    console.error('GET /api/events/near error:', error)
    return NextResponse.json({ error: 'Near-me query failed' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create /api/geocode**

```typescript
// src/app/api/geocode/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })
    const token = process.env.MAPBOX_ACCESS_TOKEN
    if (!token) return NextResponse.json({ error: 'Geocoding not configured' }, { status: 503 })
    const encoded = encodeURIComponent(address)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1`
    const res = await fetch(url)
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return NextResponse.json({ latitude: null, longitude: null })
    const [longitude, latitude] = feature.center
    return NextResponse.json({ latitude, longitude, placeName: feature.place_name })
  } catch (error) {
    console.error('POST /api/geocode error:', error)
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Create /api/import (admin-only stub)**

```typescript
// src/app/api/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const { source } = await request.json()
    if (!source) return NextResponse.json({ error: 'source required' }, { status: 400 })
    // Stub: real importers wired in Task 15
    return NextResponse.json({ imported: 0, duplicates: 0, source })
  } catch (error) {
    console.error('POST /api/import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/events/ src/app/api/geocode/ src/app/api/import/
git commit -m "feat(events): add search, near, geocode, import API routes"
```

---

### Task 13: Events Server Actions

**Files:**
- Create: `src/modules/events/actions/preferences.ts`
- Create: `src/modules/events/actions/submit.ts`
- Create: `src/modules/events/actions/ical.ts`
- Create: `src/modules/events/actions/admin.ts`

- [ ] **Step 1: Create preferences.ts**

```typescript
// src/modules/events/actions/preferences.ts
'use server'

import { auth } from '@/lib/auth/config'
import { getUserEventPreference, upsertUserEventPreference } from '../lib/queries'
import type { UserEventPreferenceData } from '../types'

export async function getMyEventPreferences() {
  const session = await auth()
  if (!session?.user?.id) return null
  return getUserEventPreference(session.user.id)
}

export async function updateMyEventPreferences(data: UserEventPreferenceData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')
  return upsertUserEventPreference(session.user.id, data)
}
```

- [ ] **Step 2: Create submit.ts**

```typescript
// src/modules/events/actions/submit.ts
'use server'

import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'

export async function submitEvent(data: {
  title: string
  slug: string
  description?: string
  startDate: Date
  eventType: string
  location?: string
  address?: string
  city?: string
  state?: string
  registrationUrl?: string
  isFree?: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  await db.query(
    `INSERT INTO events (id, "creatorId", title, slug, description, "startDate", "eventType", status,
      location, address, city, state, "registrationUrl", "isFree", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'pending_review', $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
    [session.user.id, data.title, data.slug, data.description ?? null, data.startDate,
     data.eventType, data.location ?? null, data.address ?? null, data.city ?? null,
     data.state ?? null, data.registrationUrl ?? null, data.isFree ?? false]
  )

  revalidatePath('/admin/submissions')
}
```

- [ ] **Step 3: Create ical.ts**

```typescript
// src/modules/events/actions/ical.ts
'use server'

import { getEventBySlug } from '../lib/queries'

export async function generateEventIcal(slug: string): Promise<string> {
  const event = await getEventBySlug(slug)
  if (!event) throw new Error('Event not found')

  const start = new Date(event.startDate)
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ride MTB//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@ride-mtb.com`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
    event.location ? `LOCATION:${event.location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}
```

- [ ] **Step 4: Create admin.ts**

```typescript
// src/modules/events/actions/admin.ts
'use server'

import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'

export async function approveSubmission(eventId: string) {
  await requireAdmin()
  await db.query(`UPDATE events SET status = 'published', "updatedAt" = NOW() WHERE id = $1`, [eventId])
  revalidatePath('/admin/submissions')
  revalidatePath('/events')
}

export async function rejectSubmission(eventId: string, reason?: string) {
  await requireAdmin()
  await db.query(`UPDATE events SET status = 'draft', "updatedAt" = NOW() WHERE id = $1`, [eventId])
  revalidatePath('/admin/submissions')
}

export async function verifyOrganizer(organizerId: string) {
  await requireAdmin()
  await db.query(`UPDATE organizer_profiles SET "isVerified" = true, "updatedAt" = NOW() WHERE id = $1`, [organizerId])
  revalidatePath('/admin/organizers')
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/events/actions/
git commit -m "feat(events): add preferences, submit, ical, admin server actions"
```

---

### Task 14: Import Pipeline

**Files:**
- Create: `src/modules/events/lib/import/dedup.ts`
- Create: `src/modules/events/lib/import/bikereg.ts`
- Create: `src/modules/events/lib/import/usac.ts`

- [ ] **Step 1: Create dedup.ts**

```typescript
// src/modules/events/lib/import/dedup.ts
import { db } from '@/lib/db/client'

export interface ImportEvent {
  title: string
  slug: string
  startDate: Date
  eventType: string
  importSource: string
  externalId: string
  location?: string
  city?: string
  state?: string
  registrationUrl?: string
  isFree?: boolean
  description?: string
}

export async function dedupAndInsert(events: ImportEvent[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0

  for (const event of events) {
    const existing = await db.query(
      `SELECT id FROM events WHERE "importSource" = $1 AND "externalId" = $2 LIMIT 1`,
      [event.importSource, event.externalId]
    )
    if (existing.rows.length > 0) {
      skipped++
      continue
    }

    await db.query(
      `INSERT INTO events (id, title, slug, "startDate", "eventType", status, "importSource", "externalId",
        location, city, state, "registrationUrl", "isFree", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'published', $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [event.title, event.slug, event.startDate, event.eventType, event.importSource,
       event.externalId, event.location ?? null, event.city ?? null, event.state ?? null,
       event.registrationUrl ?? null, event.isFree ?? false]
    )
    inserted++
  }

  return { inserted, skipped }
}
```

- [ ] **Step 2: Create bikereg.ts + usac.ts (stubs)**

```typescript
// src/modules/events/lib/import/bikereg.ts
import type { ImportEvent } from './dedup'

export async function fetchBikeRegEvents(): Promise<ImportEvent[]> {
  // TODO: integrate real BikeReg API when access is available
  // Sample data for testing the import pipeline:
  return [
    {
      title: 'Sample BikeReg XC Race',
      slug: 'sample-bikereg-xc-race',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      eventType: 'race_xc',
      importSource: 'bikereg',
      externalId: 'bikereg-sample-001',
      city: 'Denver',
      state: 'CO',
      isFree: false,
    },
  ]
}
```

```typescript
// src/modules/events/lib/import/usac.ts
import type { ImportEvent } from './dedup'

export async function fetchUSACEvents(): Promise<ImportEvent[]> {
  // TODO: integrate real USAC API when access is available
  return []
}
```

- [ ] **Step 3: Wire into /api/import**

Update `src/app/api/import/route.ts` to call the real importers:
```typescript
import { fetchBikeRegEvents } from '@/modules/events/lib/import/bikereg'
import { fetchUSACEvents } from '@/modules/events/lib/import/usac'
import { dedupAndInsert } from '@/modules/events/lib/import/dedup'

// In POST handler, replace stub with:
const events = source === 'bikereg' ? await fetchBikeRegEvents()
             : source === 'usac'    ? await fetchUSACEvents()
             : []
const result = await dedupAndInsert(events)
return NextResponse.json(result)
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/events/lib/import/ src/app/api/import/
git commit -m "feat(events): add import pipeline with dedup, BikeReg stub, USAC stub"
```

---

### Task 15: Events Discovery Pages + Components

**Files:**
- Create: `src/app/events/map/page.tsx`
- Create: `src/app/events/search/page.tsx`
- Create: `src/app/events/near-me/page.tsx`
- Create: `src/app/events/my-events/page.tsx`
- Create: `src/app/events/preferences/page.tsx`
- Create: `src/modules/events/components/EventFilterBar.tsx`
- Create: `src/modules/events/components/EventSplitView.tsx`
- Create: `src/modules/events/components/NearMePrompt.tsx`
- Create: `src/modules/events/components/SearchBar.tsx`
- Create: `src/modules/events/components/MyEventsList.tsx`
- Create: `src/modules/events/components/EventTypeBadge.tsx`

- [ ] **Step 1: Create EventTypeBadge**

```typescript
// src/modules/events/components/EventTypeBadge.tsx
const TYPE_COLORS: Record<string, string> = {
  race: 'bg-red-100 text-red-700',
  race_xc: 'bg-red-100 text-red-700',
  race_enduro: 'bg-red-100 text-red-700',
  race_dh: 'bg-red-100 text-red-700',
  race_marathon: 'bg-red-100 text-red-700',
  race_other: 'bg-red-100 text-red-700',
  group_ride: 'bg-green-100 text-green-700',
  clinic: 'bg-blue-100 text-blue-700',
  camp: 'bg-blue-100 text-blue-700',
  skills_clinic: 'bg-blue-100 text-blue-700',
  trail_work: 'bg-amber-100 text-amber-700',
  social: 'bg-purple-100 text-purple-700',
  expo: 'bg-purple-100 text-purple-700',
  demo_day: 'bg-purple-100 text-purple-700',
}

export function EventTypeBadge({ eventType }: { eventType: string }) {
  const cls = TYPE_COLORS[eventType] ?? 'bg-gray-100 text-gray-700'
  const label = eventType.replace(/_/g, ' ')
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Create events/map page**

```typescript
// src/app/events/map/page.tsx
import { Suspense } from 'react'
import { UnifiedMapDynamic } from '@/modules/map'

export const metadata = { title: 'Events Map | Ride MTB' }

export default function EventsMapPage() {
  return (
    <div className="h-[calc(100vh_-_var(--nav-height))]">
      <Suspense fallback={<div className="h-full bg-[var(--color-bg-secondary)]" />}>
        <UnifiedMapDynamic
          defaultLayers={['events']}
          availableLayers={['trails', 'events', 'coaching']}
          className="h-full"
        />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 3: Create EventFilterBar**

```typescript
// src/modules/events/components/EventFilterBar.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const EVENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'race_xc', label: 'XC Race' },
  { value: 'race_enduro', label: 'Enduro' },
  { value: 'race_dh', label: 'DH Race' },
  { value: 'group_ride', label: 'Group Ride' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'trail_work', label: 'Trail Work' },
  { value: 'social', label: 'Social' },
]

export function EventFilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <select
        value={searchParams.get('type') ?? ''}
        onChange={(e) => updateParam('type', e.target.value)}
        className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm"
      >
        {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <label className="flex items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          checked={searchParams.get('free') === 'true'}
          onChange={(e) => updateParam('free', e.target.checked ? 'true' : '')}
        />
        Free events only
      </label>
    </div>
  )
}
```

- [ ] **Step 4: Create events/search page**

```typescript
// src/app/events/search/page.tsx
import { searchEvents } from '@/modules/events/lib/queries'
import { EventFilterBar } from '@/modules/events/components/EventFilterBar'
import { EventTypeBadge } from '@/modules/events/components/EventTypeBadge'
import { Suspense } from 'react'

export const metadata = { title: 'Search Events | Ride MTB' }

interface Props {
  searchParams: Promise<{ q?: string; type?: string; free?: string }>
}

export default async function EventsSearchPage({ searchParams }: Props) {
  const params = await searchParams
  const { events } = await searchEvents({
    query: params.q,
    eventType: params.type,
    isFree: params.free === 'true' ? true : undefined,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Find Events</h1>
      <Suspense>
        <EventFilterBar />
      </Suspense>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <a key={event.id} href={`/events/${event.slug}`}
            className="block rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-primary)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[var(--color-text)]">{event.title}</p>
                <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                  {new Date(event.startDate).toLocaleDateString()} · {event.city}, {event.state}
                </p>
              </div>
              <EventTypeBadge eventType={event.eventType} />
            </div>
          </a>
        ))}
        {events.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">No events found.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create near-me page (skeleton)**

```typescript
// src/app/events/near-me/page.tsx
import { auth } from '@/lib/auth/config'
import { getUserEventPreference } from '@/modules/events/lib/queries'

export const metadata = { title: 'Events Near Me | Ride MTB' }

export default async function NearMePage() {
  const session = await auth()
  const prefs = session?.user?.id ? await getUserEventPreference(session.user.id) : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-[var(--color-text)]">Events Near Me</h1>
      {!prefs?.homeLatitude ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          Set your home location in <a href="/events/preferences" className="text-[var(--color-primary)] hover:underline">preferences</a> to find events near you.
        </p>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Loading events within {prefs.searchRadius}km…</p>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create my-events, preferences pages (skeletons)**

Create `src/app/events/my-events/page.tsx` and `src/app/events/preferences/page.tsx` with minimal structure — title, heading, placeholder content. These will be fleshed out once the core flow works.

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 8: Commit**

```bash
git add src/app/events/ src/modules/events/components/
git commit -m "feat(events): add discovery pages (map, search, near-me, my-events, preferences)"
```

---

### Task 16: Events Submit + Admin Pages

**Files:**
- Create: `src/app/events/submit/page.tsx`
- Create: `src/modules/events/components/SubmitEventForm.tsx`
- Create: `src/modules/events/components/LocationPicker.tsx`
- Create: `src/app/admin/submissions/page.tsx`
- Create: `src/modules/events/components/SubmissionQueue.tsx`
- Create: `src/app/admin/import/page.tsx`
- Create: `src/modules/events/components/ImportManager.tsx`
- Create: `src/app/admin/organizers/page.tsx`
- Create: `src/modules/events/components/OrganizerManager.tsx`

- [ ] **Step 1: Create LocationPicker (client component)**

```typescript
// src/modules/events/components/LocationPicker.tsx
'use client'

import { useState } from 'react'

interface LocationPickerProps {
  onLocationChange: (location: { address: string; latitude: number | null; longitude: number | null }) => void
}

export function LocationPicker({ onLocationChange }: LocationPickerProps) {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function geocode() {
    if (!address.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = await res.json()
      setResult(data.placeName ?? address)
      onLocationChange({ address, latitude: data.latitude, longitude: data.longitude })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Venue address or city, state"
          className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
        <button type="button" onClick={geocode} disabled={loading}
          className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-50">
          {loading ? 'Looking up…' : 'Find'}
        </button>
      </div>
      {result && <p className="text-xs text-[var(--color-text-muted)]">📍 {result}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create SubmitEventForm**

```typescript
// src/modules/events/components/SubmitEventForm.tsx
'use client'

import { useState } from 'react'
import { LocationPicker } from './LocationPicker'
import { submitEvent } from '../actions/submit'

export function SubmitEventForm() {
  const [location, setLocation] = useState<{ address: string; latitude: number | null; longitude: number | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      const title = fd.get('title') as string
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
      await submitEvent({
        title,
        slug,
        description: fd.get('description') as string || undefined,
        startDate: new Date(fd.get('startDate') as string),
        eventType: fd.get('eventType') as string,
        location: location?.address,
        isFree: fd.get('isFree') === 'on',
        registrationUrl: fd.get('registrationUrl') as string || undefined,
      })
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) return <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">✅ Event submitted for review! We'll publish it within 24 hours.</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Event Title *</label>
        <input name="title" required className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Event Type *</label>
        <select name="eventType" required className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm">
          <option value="group_ride">Group Ride</option>
          <option value="race_xc">XC Race</option>
          <option value="race_enduro">Enduro Race</option>
          <option value="race_dh">DH Race</option>
          <option value="clinic">Clinic</option>
          <option value="trail_work">Trail Work</option>
          <option value="social">Social</option>
          <option value="expo">Expo / Demo</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Start Date *</label>
        <input name="startDate" type="date" required className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Location</label>
        <LocationPicker onLocationChange={setLocation} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea name="description" rows={4} className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Registration URL</label>
        <input name="registrationUrl" type="url" className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="isFree" type="checkbox" />
        Free event
      </label>
      <button type="submit" disabled={submitting}
        className="w-full rounded bg-[var(--color-primary)] py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? 'Submitting…' : 'Submit Event'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create submit page**

```typescript
// src/app/events/submit/page.tsx
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { SubmitEventForm } from '@/modules/events/components/SubmitEventForm'

export const metadata = { title: 'Submit an Event | Ride MTB' }

export default async function SubmitEventPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text)]">Submit an Event</h1>
      <p className="mb-8 text-sm text-[var(--color-text-muted)]">Submit your event for review. We'll publish it within 24 hours.</p>
      <SubmitEventForm />
    </div>
  )
}
```

- [ ] **Step 4: Create admin submissions page + SubmissionQueue**

```typescript
// src/app/admin/submissions/page.tsx
import { db } from '@/lib/db/client'
import { SubmissionQueue } from '@/modules/events/components/SubmissionQueue'

export const metadata = { title: 'Event Submissions | Admin' }

export default async function AdminSubmissionsPage() {
  const result = await db.query(
    `SELECT id, title, "eventType", "startDate", city, state, "createdAt"
     FROM events WHERE status = 'pending_review' ORDER BY "createdAt" DESC`
  )
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-[var(--color-text)]">Event Submissions</h1>
      <SubmissionQueue events={result.rows} />
    </div>
  )
}
```

Create `SubmissionQueue` as a client component with approve/reject buttons calling `approveSubmission`/`rejectSubmission` server actions.

- [ ] **Step 5: Create admin import + organizers pages**

Create `src/app/admin/import/page.tsx` with an `ImportManager` client component that calls `/api/import`. Create `src/app/admin/organizers/page.tsx` with an `OrganizerManager` component.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add src/app/events/submit/ src/app/admin/ src/modules/events/components/
git commit -m "feat(events): add submit page, admin submissions/import/organizers"
```

---

### Task 17: Event Detail Page Enrichment

**Files:**
- Create: `src/modules/events/components/EventHero.tsx`
- Create: `src/modules/events/components/EventInfoGrid.tsx`
- Create: `src/modules/events/components/IcalDownload.tsx`
- Create: `src/modules/events/components/RelatedEvents.tsx`
- Create: `src/modules/events/components/ResultsBanner.tsx`
- Create: `src/modules/events/components/AttendeeRow.tsx`

- [ ] **Step 1: Create EventHero**

```typescript
// src/modules/events/components/EventHero.tsx
import Image from 'next/image'
import { EventTypeBadge } from './EventTypeBadge'

interface EventHeroProps {
  title: string
  eventType: string
  startDate: Date
  city?: string | null
  state?: string | null
  coverImageUrl?: string | null
}

export function EventHero({ title, eventType, startDate, city, state, coverImageUrl }: EventHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {coverImageUrl && (
        <div className="relative h-48 w-full">
          <Image src={coverImageUrl} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}
      <div className={coverImageUrl ? 'absolute bottom-0 p-4' : 'p-0 pb-4'}>
        <div className="mb-2">
          <EventTypeBadge eventType={eventType} />
        </div>
        <h1 className={`text-2xl font-bold ${coverImageUrl ? 'text-white' : 'text-[var(--color-text)]'}`}>
          {title}
        </h1>
        <p className={`mt-1 text-sm ${coverImageUrl ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
          {new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {city && state && ` · ${city}, ${state}`}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create IcalDownload**

```typescript
// src/modules/events/components/IcalDownload.tsx
'use client'

import { generateEventIcal } from '../actions/ical'

export function IcalDownload({ slug }: { slug: string }) {
  async function handleDownload() {
    const ical = await generateEventIcal(slug)
    const blob = new Blob([ical], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button onClick={handleDownload}
      className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
      📅 Add to Calendar
    </button>
  )
}
```

- [ ] **Step 3: Create EventInfoGrid, RelatedEvents, ResultsBanner, AttendeeRow stubs**

Create minimal versions of each component that render the key data fields. These are display-only components with no complex logic.

- [ ] **Step 4: Commit**

```bash
git add src/modules/events/components/
git commit -m "feat(events): add event detail components (hero, info grid, ical, related)"
```

---

### Task 18: Cron Jobs + vercel.json

**Files:**
- Create: `src/app/api/cron/events/reminders/route.ts`
- Create: `src/app/api/cron/events/complete-past/route.ts`
- Create: `src/app/api/cron/events/geocode/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create cron/events/reminders**

```typescript
// src/app/api/cron/events/reminders/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { sendEventReminders } = await import('@/modules/events/lib/notifications')
  const result = await sendEventReminders()
  return NextResponse.json(result)
}
```

Create a minimal `src/modules/events/lib/notifications.ts` stub:
```typescript
export async function sendEventReminders() {
  // TODO: query events with startDate in (reminderDays) days, create notification records
  return { sent: 0 }
}
```

- [ ] **Step 2: Create cron/events/complete-past**

```typescript
// src/app/api/cron/events/complete-past/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await db.query(
    `UPDATE events SET status = 'completed', "updatedAt" = NOW()
     WHERE status = 'published' AND "startDate" < NOW() - INTERVAL '1 day'`
  )
  return NextResponse.json({ updated: result.rowCount })
}
```

- [ ] **Step 3: Create cron/events/geocode**

```typescript
// src/app/api/cron/events/geocode/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function GET(request: Request) {
  const auth = request.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = process.env.MAPBOX_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'No geocoding token' }, { status: 503 })

  const { rows } = await db.query(
    `SELECT id, address, city, state FROM events
     WHERE latitude IS NULL AND longitude IS NULL
       AND (address IS NOT NULL OR city IS NOT NULL)
     LIMIT 50`
  )

  let geocoded = 0
  for (const row of rows) {
    const query = [row.address, row.city, row.state].filter(Boolean).join(', ')
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1`)
      const data = await res.json()
      const [lng, lat] = data.features?.[0]?.center ?? [null, null]
      if (lat && lng) {
        await db.query(`UPDATE events SET latitude = $1, longitude = $2 WHERE id = $3`, [lat, lng, row.id])
        geocoded++
      }
    } catch { /* skip this event */ }
  }

  return NextResponse.json({ geocoded, total: rows.length })
}
```

- [ ] **Step 4: Update vercel.json**

Read `vercel.json` and add 3 new cron entries to the existing `crons` array:
```json
{ "path": "/api/cron/events/reminders",    "schedule": "0 9 * * *" },
{ "path": "/api/cron/events/complete-past", "schedule": "0 0 * * *" },
{ "path": "/api/cron/events/geocode",       "schedule": "0 2 * * *" }
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/events/ src/modules/events/lib/notifications.ts vercel.json
git commit -m "feat(events): add event cron jobs (reminders, complete-past, geocode)"
```

---

## Phase 5 — Coaching Clinics

### Task 19: Coaching Clinic Queries + Actions

**Files:**
- Create: `src/modules/coaching/lib/queries.ts` (clinic queries)
- Create: `src/modules/coaching/actions/clinics.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/modules/coaching/lib/queries.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getUpcomingClinics, getClinicBySlug } from './queries'

vi.mock('@/lib/db/client', () => ({ db: { query: vi.fn() } }))
import { db } from '@/lib/db/client'
const mockDb = vi.mocked(db)

describe('getUpcomingClinics', () => {
  it('returns published upcoming clinics', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: '1', slug: 'test-clinic', title: 'Beginner Clinic', startDate: new Date() }],
    } as any)
    const result = await getUpcomingClinics()
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
npx vitest run src/modules/coaching/lib/queries.test.ts
```

- [ ] **Step 3: Create coaching/lib/queries.ts**

```typescript
// src/modules/coaching/lib/queries.ts
import { db } from '@/lib/db/client'

export async function getUpcomingClinics(limit = 20) {
  const result = await db.query(
    `SELECT cc.id, cc.slug, cc.title, cc.description, cc."startDate", cc."endDate",
            cc.location, cc.latitude, cc.longitude, cc."costCents", cc."isFree", cc."calcomLink",
            u.name AS "coachName", cp.id AS "coachId"
     FROM coaching_clinics cc
     JOIN coach_profiles cp ON cp.id = cc."coachId"
     JOIN users u ON u.id = cp."userId"
     WHERE cc.status = 'published' AND cc."startDate" >= NOW()
     ORDER BY cc."startDate"
     LIMIT $1`,
    [limit]
  )
  return result.rows
}

export async function getClinicBySlug(slug: string) {
  const result = await db.query(
    `SELECT cc.*, u.name AS "coachName", cp.id AS "coachId", cp.bio AS "coachBio",
            cp.specialties AS "coachSpecialties", cp."calcomLink" AS "coachCalcomLink"
     FROM coaching_clinics cc
     JOIN coach_profiles cp ON cp.id = cc."coachId"
     JOIN users u ON u.id = cp."userId"
     WHERE cc.slug = $1`,
    [slug]
  )
  return result.rows[0] ?? null
}

export async function getCoachClinics(coachId: string) {
  const result = await db.query(
    `SELECT id, slug, title, "startDate", status, capacity, "costCents", "isFree"
     FROM coaching_clinics WHERE "coachId" = $1 ORDER BY "startDate" DESC`,
    [coachId]
  )
  return result.rows
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/modules/coaching/lib/queries.test.ts
```

- [ ] **Step 5: Create coaching/actions/clinics.ts**

```typescript
// src/modules/coaching/actions/clinics.ts
'use server'

import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'

async function getCoachProfileForUser(userId: string) {
  const result = await db.query(`SELECT id FROM coach_profiles WHERE "userId" = $1`, [userId])
  return result.rows[0] ?? null
}

export async function createClinic(data: {
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  location: string
  latitude?: number
  longitude?: number
  capacity?: number
  costCents?: number
  isFree?: boolean
  calcomLink?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')
  const coach = await getCoachProfileForUser(session.user.id)
  if (!coach) throw new Error('No coach profile found')

  const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()

  await db.query(
    `INSERT INTO coaching_clinics (id, "coachId", slug, title, description, "startDate", "endDate",
      location, latitude, longitude, capacity, "costCents", "isFree", "calcomLink", status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'published', NOW(), NOW())`,
    [coach.id, slug, data.title, data.description ?? null, data.startDate, data.endDate ?? null,
     data.location, data.latitude ?? null, data.longitude ?? null, data.capacity ?? null,
     data.costCents ?? null, data.isFree ?? false, data.calcomLink ?? null]
  )

  revalidatePath('/coaching/clinics')
  revalidatePath('/coaching/dashboard/clinics')
  return { slug }
}

export async function deleteClinic(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')
  const coach = await getCoachProfileForUser(session.user.id)
  if (!coach) throw new Error('No coach profile found')
  await db.query(`DELETE FROM coaching_clinics WHERE id = $1 AND "coachId" = $2`, [id, coach.id])
  revalidatePath('/coaching/dashboard/clinics')
}
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/coaching/
git commit -m "feat(coaching): add clinic queries and server actions"
```

---

### Task 20: Coaching Pages + Components

**Files:**
- Create: `src/modules/coaching/components/CoachingClinicCard.tsx`
- Create: `src/modules/coaching/components/CoachingClinicForm.tsx`
- Create: `src/modules/coaching/components/ClinicList.tsx`
- Create: `src/app/coaching/map/page.tsx`
- Create: `src/app/coaching/clinics/page.tsx`
- Create: `src/app/coaching/clinics/[slug]/page.tsx`
- Create: `src/app/coaching/dashboard/clinics/page.tsx`
- Create: `src/app/coaching/dashboard/clinics/new/page.tsx`

- [ ] **Step 1: Create CoachingClinicCard**

```typescript
// src/modules/coaching/components/CoachingClinicCard.tsx
interface CoachingClinicCardProps {
  id: string
  slug: string
  title: string
  startDate: Date
  location: string
  costCents?: number | null
  isFree: boolean
  coachName: string
  calcomLink?: string | null
}

export function CoachingClinicCard({ slug, title, startDate, location, costCents, isFree, coachName, calcomLink }: CoachingClinicCardProps) {
  const price = isFree ? 'Free' : costCents ? `$${(costCents / 100).toFixed(0)}` : 'Contact for pricing'

  return (
    <a href={`/coaching/clinics/${slug}`}
      className="block rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-primary)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-[var(--color-text)]">{title}</p>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            {new Date(startDate).toLocaleDateString()} · {location}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">with {coachName}</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-[var(--color-text)]">{price}</span>
          {calcomLink && (
            <a href={calcomLink} target="_blank" rel="noopener noreferrer"
              className="mt-1 block text-xs text-[var(--color-primary)] hover:underline"
              onClick={(e) => e.stopPropagation()}>
              Book →
            </a>
          )}
        </div>
      </div>
    </a>
  )
}
```

- [ ] **Step 2: Create coaching/map page**

```typescript
// src/app/coaching/map/page.tsx
import { Suspense } from 'react'
import { UnifiedMapDynamic } from '@/modules/map'

export const metadata = { title: 'Coaching Map | Ride MTB' }

export default function CoachingMapPage() {
  return (
    <div className="h-[calc(100vh_-_var(--nav-height))]">
      <Suspense fallback={<div className="h-full bg-[var(--color-bg-secondary)]" />}>
        <UnifiedMapDynamic
          defaultLayers={['coaching']}
          availableLayers={['trails', 'events', 'coaching']}
          className="h-full"
        />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 3: Create coaching/clinics browse page**

```typescript
// src/app/coaching/clinics/page.tsx
import { getUpcomingClinics } from '@/modules/coaching/lib/queries'
import { CoachingClinicCard } from '@/modules/coaching/components/CoachingClinicCard'

export const metadata = { title: 'Coaching Clinics | Ride MTB' }

export default async function ClinicsPage() {
  const clinics = await getUpcomingClinics(40)
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Coaching Clinics</h1>
      {clinics.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No upcoming clinics yet.</p>
      ) : (
        <div className="space-y-3">
          {clinics.map((c) => <CoachingClinicCard key={c.id} {...c} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create clinic detail page**

```typescript
// src/app/coaching/clinics/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { getClinicBySlug } from '@/modules/coaching/lib/queries'

interface Props { params: Promise<{ slug: string }> }

export default async function ClinicDetailPage({ params }: Props) {
  const { slug } = await params
  const clinic = await getClinicBySlug(slug)
  if (!clinic) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text)]">{clinic.title}</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        {new Date(clinic.startDate).toLocaleDateString()} · {clinic.location}
      </p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">with {clinic.coachName}</p>
      {clinic.description && (
        <p className="mt-4 text-sm text-[var(--color-text)]">{clinic.description}</p>
      )}
      <div className="mt-6">
        <p className="text-lg font-semibold">
          {clinic.isFree ? 'Free' : clinic.costCents ? `$${(clinic.costCents / 100).toFixed(0)}` : 'Contact for pricing'}
        </p>
        {clinic.calcomLink && (
          <a href={clinic.calcomLink} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-block rounded bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white">
            Book This Clinic
          </a>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create coach dashboard clinic pages**

Create `src/app/coaching/dashboard/clinics/page.tsx` (list with delete), `src/app/coaching/dashboard/clinics/new/page.tsx` (form using `CoachingClinicForm`). Create `CoachingClinicForm` component reusing `LocationPicker` from events module.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/coaching/ src/app/coaching/
git commit -m "feat(coaching): add clinic pages (map, browse, detail, dashboard)"
```

---

### Task 21: Batch Geocode Script

**Files:**
- Create: `scripts/geocode-coaches.ts`

- [ ] **Step 1: Create geocode-coaches.ts**

```typescript
// scripts/geocode-coaches.ts
import { Pool } from 'pg'

const db = new Pool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME ?? 'postgres',
  ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
  port: Number(process.env.DATABASE_PORT ?? 5432),
})

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN
if (!MAPBOX_TOKEN) {
  console.error('MAPBOX_ACCESS_TOKEN is required')
  process.exit(1)
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const encoded = encodeURIComponent(address)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&limit=1`
  const res = await fetch(url)
  const data = await res.json()
  const coords = data.features?.[0]?.center
  if (!coords) return null
  return { lat: coords[1], lng: coords[0] }
}

async function main() {
  const { rows } = await db.query(
    `SELECT id, location FROM coach_profiles
     WHERE location IS NOT NULL AND latitude IS NULL AND longitude IS NULL`
  )
  console.log(`Found ${rows.length} coaches to geocode`)

  for (const row of rows) {
    const coords = await geocodeAddress(row.location)
    if (coords) {
      await db.query(
        `UPDATE coach_profiles SET latitude = $1, longitude = $2 WHERE id = $3`,
        [coords.lat, coords.lng, row.id]
      )
      console.log(`✓ ${row.location} → ${coords.lat}, ${coords.lng}`)
    } else {
      console.log(`✗ Could not geocode: ${row.location}`)
    }
    await new Promise((r) => setTimeout(r, 100)) // rate limiting
  }

  await db.end()
  console.log('Done')
}

main().catch(console.error)
```

- [ ] **Step 2: Run script (dry run — check output only)**

```bash
# Do not run against production. Verify the script compiles:
npx tsc --noEmit scripts/geocode-coaches.ts 2>&1 | head -10
```

Instructions for running after deployment:
```bash
# Run after production migration with Supabase env vars:
MAPBOX_ACCESS_TOKEN=sk.ey... DATABASE_HOST=aws-1-us-west-1.pooler.supabase.com \
DATABASE_USER=postgres.ulvnbvmtzzqruaaozhrr DATABASE_PASSWORD=... \
npx tsx scripts/geocode-coaches.ts
```

- [ ] **Step 3: Commit**

```bash
git add scripts/geocode-coaches.ts
git commit -m "feat(coaching): add batch geocode script for coach profiles"
```

---

### Task 22: Final Type-check + Build Verify

- [ ] **Step 1: Run full type-check**

```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: 0 errors.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run 2>&1 | tail -20
```
Expected: All pass (new tests plus existing tests).

- [ ] **Step 3: Verify build compiles**

```bash
npx next build --turbopack 2>&1 | tail -20
```
Expected: Successful build with no type errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: events migration + unified map + coaching clinics complete"
```

---

## Environment Setup Checklist

Before starting Task 1, verify:
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` exists in `.env.local` (client-side map rendering)
- [ ] `MAPBOX_ACCESS_TOKEN` added to `.env.local` (server-side geocoding)
- [ ] `DATABASE_*` vars present in `.env.local`
- [ ] `CRON_SECRET` present in `.env.local`
- [ ] Running on Vercel Pro (required for 9 crons)

---

## Post-Deployment Checklist

After deploying to Vercel:
1. Add `MAPBOX_ACCESS_TOKEN` to Vercel env vars (Production + Preview)
2. Run `scripts/geocode-coaches.ts` once to backfill coach coordinates
3. Verify 3 new crons appear in Vercel dashboard
4. Test `/trails/map` visually — confirm no regression from SystemClusterMap removal
5. Submit a test event via `/events/submit` and approve it in `/admin/submissions`
6. Verify event appears on `/events/map` after approval
