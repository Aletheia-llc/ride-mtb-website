# Bikes Garage Group A — Implementation Design

## Overview

Catch up the Ride MTB monolith's bike garage with features from the standalone bike garage repo. Group A covers features that require **no schema changes** — deployable immediately against the existing `UserBike`, `BikeComponent`, and `BuildLogEntry` models.

**Monolith path:** `src/modules/bikes/`
**Target branch:** `feature/bikes-garage-group-a`

---

## Schema Reference

### UserBike (existing)

```
id: String (cuid)          name: String (required)     brand: String (required)
model: String (required)   year: Int?                  category: BikeCategory (enum)
wheelSize: String?         frameSize: String?           weight: Float? ← stored in LBS
imageUrl: String?          isPrimary: Boolean           notes: String?
frameMaterial: String?     travel: Int? ← mm            purchaseYear: Int?
purchasePrice: Int? ← whole dollars
```

### BikeComponent (existing)

```
id: String (cuid)          bikeId: String              category: BikeComponentCategory
brand: String (required)   model: String (required)    year: Int?
weightGrams: Int? ← grams  priceCents: Int? ← cents    notes: String?
installedAt: DateTime       removedAt: DateTime?        isActive: Boolean
```

### BuildLogEntry (existing)

```
id: String  bikeId: String  userId: String  title: String
description: String?  imageUrl: String?  entryDate: DateTime
```

Note: No `cost` field on `BuildLogEntry` — build log costs deferred to Group B.

### BikeCategory Enum (lowercase)

`gravel | xc | trail | enduro | downhill | dirt_jump | ebike | other`

### BikeComponentCategory Enum (uppercase)

`FRAME | FORK | SHOCK | WHEELS | DRIVETRAIN | BRAKES | COCKPIT | SEATPOST | SADDLE | PEDALS | OTHER`

### Unit Conversions

- Component weight: `weightGrams` (Int) — display toggle: g / lbs (`÷ 453.592`) / oz (`÷ 28.3495`)
- Component price: `priceCents` (Int) — display as dollars: `priceCents / 100`
- Bike frame weight: `weight` (Float) — stored in lbs. Convert to grams for cross-comparison: `× 453.592`
- Bike purchase price: `purchasePrice` (Int) — stored as whole dollars (no conversion needed)

---

## Architecture

### New Routes

| Route | File |
|-------|------|
| `/bikes/garage/stats` | `src/app/bikes/garage/stats/page.tsx` + `StatsClient.tsx` |
| `/bikes/garage/compare?bikes=id1,id2[,id3]` | `src/app/bikes/garage/compare/page.tsx` + `ComparisonView.tsx` |

### New Module Files

```
src/modules/bikes/
  lib/
    garage-queries.ts         ← ADD: getBikeStats(), getBikesForCompare()
  actions/
    garage-actions.ts         ← NEW: duplicateBike(), exportBike(), importBike()
  components/garage/
    WeightBreakdown.tsx        ← NEW
    CostSummaryCard.tsx        ← NEW
    ShareButton.tsx            ← NEW
    DuplicateBikeButton.tsx    ← NEW
    ExportImportSection.tsx    ← NEW
    GarageView.tsx             ← MODIFY: add stats link + compare mode
```

### Modified Pages

- `src/app/bikes/garage/[bikeId]/page.tsx` — add WeightBreakdown, CostSummaryCard, ShareButton, DuplicateBikeButton, ExportImportSection to overview tab

### No Toast Library

Feedback uses inline state (`setSaved`, `setTimeout`) matching the pattern in `EventPreferencesForm`. No new dependencies required.

---

## Feature 1: Stats Page

**Route:** `GET /bikes/garage/stats`
**Auth:** required (redirects to `/signin` if no session)

### Data Shape

```typescript
interface BikeStats {
  bikeCount: number
  totalInvestmentDollars: number   // purchasePrice (whole $) + sum(priceCents / 100)
  totalComponents: number
  bikeBreakdown: {
    id: string
    name: string
    brand: string
    category: BikeCategory
    purchasePriceDollars: number   // purchasePrice (whole $)
    componentCostDollars: number   // sum(active priceCents) / 100
    componentCount: number
    frameWeightLbs: number | null  // bike.weight (Float, lbs)
    componentWeightGrams: number   // sum(active weightGrams)
  }[]
  categorySpending: Record<string, number>   // BikeComponentCategory → total dollars
  brandCounts: Record<string, number>         // bike brand → count
}
```

Total weight display: shown separately as frame weight (lbs) and component weight (grams) rather than a combined sum (avoids unit-mixing complexity).

### Query: `getBikeStats(userId)`

Added to `src/modules/bikes/lib/garage-queries.ts`. Fetches all user bikes with `{ where: { isActive: true } }` on components. Aggregation in application code.

### UI

Server component computes stats, passes to `StatsClient` (client component for tab switching).

**Three tabs:**

- **Overview** — bike count card, total investment card, brand distribution bars (sorted by count desc)
- **Costs** — per-bike stacked bars: purchase price (green) + component cost (blue). No build log cost bar
- **Components** — spending by `BikeComponentCategory` (bar chart) + top 5 component brands by spend

**Navigation entry:** "Stats" link added to garage page header alongside "Add Bike" button.

---

## Feature 2: Compare Page

**Route:** `GET /bikes/garage/compare?bikes=id1,id2[,id3]`
**Auth:** required
**Validation:** 2–3 bike IDs, all owned by current user. Invalid/unauthorized IDs redirect to `/bikes/garage`.

### Query: `getBikesForCompare(bikeIds: string[], userId: string)`

Returns bikes with full fields + active components (count, total priceCents). Added to `garage-queries.ts`.

### BikeCompareData Interface

```typescript
interface BikeCompareData {
  id: string
  brand: string
  name: string
  year: number | null
  category: BikeCategory | null
  wheelSize: string | null
  frameSize: string | null
  frameMaterial: string | null
  travel: number | null              // mm (Int)
  frameWeightLbs: number | null      // bike.weight stored in lbs
  componentCount: number
  componentCostDollars: number       // sum(active priceCents) / 100
  totalInvestmentDollars: number     // purchasePrice + componentCostDollars
  purchaseYear: number | null
  purchasePriceDollars: number | null // purchasePrice (whole $)
  imageUrl: string | null
}
```

### Comparison Table Rows

| Row | Source | Best = |
|-----|--------|--------|
| Brand | `brand` | — |
| Name | `name` | — |
| Year | `year` | newest |
| Category | `category` (display label) | — |
| Wheel Size | `wheelSize` | — |
| Frame Size | `frameSize` | — |
| Frame Material | `frameMaterial` | — |
| Travel | `travel` mm | most |
| Frame Weight | `frameWeightLbs` lbs | lightest |
| Components | `componentCount` | most |
| Component Cost | `componentCostDollars` | lowest |
| Total Investment | `totalInvestmentDollars` | lowest |
| Purchase Year | `purchaseYear` | newest |

Rows with all-null values across bikes are hidden.

### Compare Entry (GarageView)

`GarageView` gains a compare mode toggle. When active:
- Each `BikeCard` shows a checkbox overlay
- Selecting 2–3 bikes enables a "Compare" button in the header
- Selecting a 4th bike is blocked (UI prevents it)
- Button navigates to `/bikes/garage/compare?bikes=id1,id2[,id3]`

---

## Feature 3: Export / Import

### Export: `exportBike(bikeId: string)`

Server action in `src/modules/bikes/actions/garage-actions.ts`. Validates ownership.

```typescript
// Export JSON structure
{
  exportedAt: string            // ISO timestamp
  version: 1
  bike: {
    name: string                // required
    brand: string               // required
    model: string               // required (not nullable in schema)
    year: number | null
    category: BikeCategory | null   // e.g. "trail", "enduro"
    wheelSize: string | null
    frameSize: string | null
    frameMaterial: string | null
    travel: number | null           // mm
    weight: number | null           // lbs (stored as-is)
    purchaseYear: number | null
    purchasePrice: number | null    // whole dollars
    notes: string | null
  }
  components: {
    category: BikeComponentCategory   // e.g. "DRIVETRAIN", "FORK"
    brand: string
    model: string
    year: number | null
    weightGrams: number | null        // grams (stored as-is)
    priceCents: number | null         // cents (stored as-is, re-imported as-is)
    notes: string | null
    isActive: boolean
  }[]
  buildLog: {
    title: string
    description: string | null
    entryDate: string               // ISO date string
    // imageUrl intentionally excluded (URLs are deployment-specific)
  }[]
}
```

Client-side: triggers a JSON file download via `URL.createObjectURL(new Blob([json], { type: 'application/json' }))`.

### Import: `importBike(jsonString: string)`

Server action. Validates:
- JSON parses successfully
- `version === 1`
- `bike.category` is a valid `BikeCategory` value if provided (`gravel|xc|trail|enduro|downhill|dirt_jump|ebike|other`)
- Each `component.category` is a valid `BikeComponentCategory` value (`FRAME|FORK|SHOCK|WHEELS|DRIVETRAIN|BRAKES|COCKPIT|SEATPOST|SADDLE|PEDALS|OTHER`)

Creates in a Prisma transaction:
1. `UserBike` with current user's `userId`
2. `BikeComponent[]` (all records from export, preserving `isActive` flag)
3. `BuildLogEntry[]` with current user's `userId`, `entryDate` parsed from ISO string

Returns `{ bikeId: string }`. Client redirects to `/bikes/garage/[bikeId]`.

**Fields not imported** (not in monolith schema yet): `status`, `color`, `weightUnit`, `make`, `purchaseDate`, `purchasedFrom`.

### ExportImportSection Component

Client component on the bike detail overview tab. Two buttons:
- **Export** — calls `exportBike()` server action, triggers file download
- **Import** — hidden `<input type="file" accept=".json">` triggered by button click → reads file → calls `importBike()` → redirect on success

Inline error state (below buttons) for import validation failures.

---

## Feature 4: WeightBreakdown Card

**File:** `src/modules/bikes/components/garage/WeightBreakdown.tsx`

Shows component weight breakdown by category with unit toggle.

```typescript
interface WeightBreakdownProps {
  categoryWeights: { category: BikeComponentCategory; weightGrams: number }[]
  totalWeightGrams: number
}
```

- Unit toggle: g / lbs / oz (client state, useState)
  - g: display as-is
  - lbs: `weightGrams / 453.592`, formatted to 2 decimal places
  - oz: `weightGrams / 28.3495`, formatted to 1 decimal place
- Proportional horizontal bars per category, sorted by weight desc
- `totalWeightGrams` derived from `sum(component.weightGrams where isActive === true)` in the server component
- **Note: does not include bike frame weight** (stored in lbs on `UserBike.weight`, separate unit)
- Only renders if `categoryWeights.length > 0`

Data sourced server-side in the existing `getBikeWithDetails` call: group active `BikeComponent` records by `category`, sum `weightGrams`.

---

## Feature 5: CostSummaryCard

**File:** `src/modules/bikes/components/garage/CostSummaryCard.tsx`

```typescript
interface CostSummaryCardProps {
  purchasePriceDollars: number           // UserBike.purchasePrice (whole $)
  componentCostDollars: number           // sum(active priceCents) / 100
  componentCount: number                 // count of active components with priceCents > 0
  categoryBreakdown: {
    category: BikeComponentCategory
    totalDollars: number                 // sum(priceCents for category) / 100
  }[]
}
```

Shows:
- Purchase price row
- Components cost row (with count)
- **Total** row (sum of both)
- Expandable category breakdown toggled by a chevron button

Only renders if `purchasePriceDollars + componentCostDollars > 0`.

**Not included:** build log costs — `BuildLogEntry` has no `cost` field (deferred to Group B).

---

## Feature 6: Duplicate Bike

**File:** `src/modules/bikes/components/garage/DuplicateBikeButton.tsx`

### Server action `duplicateBike(bikeId: string)`

- Validates ownership (throws if not found or wrong user)
- Creates new `UserBike` with all fields copied, except:
  - `name`: appended `" (copy)"`
  - `isPrimary`: forced to `false`
  - `createdAt` / `updatedAt`: fresh timestamps
- Copies all `BikeComponent` records (new IDs, preserving `isActive`, `installedAt`, `removedAt`)
- Does NOT copy `buildLog`, `maintenanceTasks`, `serviceLogs`
- Returns `{ bikeId: string }`

### UI

Button opens a native `window.confirm` dialog: "Duplicate this bike and all its components?". Inline loading state on button (`isPending`). On success, `router.push(/bikes/garage/[newId])`. No toast — show loading → then redirect.

---

## Feature 7: Share Button

**File:** `src/modules/bikes/components/garage/ShareButton.tsx`

Client component. On click:
```typescript
await navigator.clipboard.writeText(window.location.href)
```
Button text/icon changes to "Copied!" for 2 seconds (`setTimeout`), then reverts to "Share". Rapid clicks while in "Copied!" state restart the timer. No server dependency.

---

## Detail Page Integration

On the **overview tab** of `src/app/bikes/garage/[bikeId]/page.tsx`, add below the existing specs grid:

1. `<CostSummaryCard>` (render conditionally: `purchasePrice + componentCostDollars > 0`)
2. `<WeightBreakdown>` (render conditionally: `categoryWeights.length > 0`)
3. `<ExportImportSection bikeId={bike.id} />`

Add `<ShareButton>` and `<DuplicateBikeButton>` to the existing actions row alongside Edit and Delete.

---

## Navigation Wiring

### Garage Index (`GarageView`)
- Add "Stats" link (`href="/bikes/garage/stats"`) to the garage header
- Add compare mode toggle button to garage header
- `BikeCard` shows checkbox overlay when compare mode active
- "Compare (N)" button in header enabled when 2–3 bikes selected, disabled otherwise
- Selecting a 4th bike unchecks the first selected bike (or shows an inline message)

---

## Testing Plan

| Feature | Test |
|---------|------|
| Stats page | Verify totals match manual sum; verify zero-state (0 bikes) renders without crash |
| Compare | 1-bike URL → redirect; 4-bike URL → redirect; null rows hidden |
| Export | JSON structure matches schema; required fields present; file download triggers |
| Import | Bad enum values → validation error shown; all 3 models created on valid import; bad JSON → error |
| WeightBreakdown | Unit conversions correct; hidden when no components have weight |
| CostSummaryCard | Hidden when all zeros; category breakdown toggles; `priceCents / 100` math correct |
| Duplicate | `isPrimary === false`; buildLog not copied; redirect works |
| Share | "Copied!" state reverts after 2s; rapid clicks restart timer |

---

## Out of Scope (Group B)

- Bike photos (`BikePhoto` model)
- Strava OAuth (`StravaConnection` model)
- Bike ride mileage log (`BikeRideLog` model — distinct from trail `RideLog`)
- Notification bell for maintenance due dates
- `status`, `color`, `weightUnit` fields on `UserBike`
- Build log `cost` field (blocks full cost summary in `CostSummaryCard`)
