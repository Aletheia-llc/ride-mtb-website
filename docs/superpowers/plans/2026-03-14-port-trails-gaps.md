# Port Trails Gaps — 2026-03-14

## Goal
Port the highest-priority features from the standalone `ride-mtb-trail-maps` project into the Ride MTB monolith's trails module.

## Gaps Being Filled

1. **ConditionReport** — riders report current trail conditions (DRY, TACKY, HERO_DIRT, DUSTY, MUDDY, WET, SOFT, SNOWY, ICY, CLOSED)
2. **PointOfInterest** — map pins on a trail or system: trailhead, parking, water, restroom, viewpoint, feature, hazard, shuttle_stop
3. **Region** — geographic grouping above TrailSystem (e.g. "Colorado Front Range")
4. **RideLog linked to Trail/System** — `trailSystemId` FK added; `trailId` was already present
5. **Trail comparison view** — compare two trails side by side in a table

## Tasks

### Task 1 — Schema
- Add `ConditionType` and `PoiType` enums
- Add `ConditionReport`, `PointOfInterest`, `TrailRegion` models
- Extend `Trail`: `conditionReports`, `pois`, `currentCondition`, `conditionReportedAt`
- Extend `TrailSystem`: `regionId`, `region`, `pois`
- Extend `RideLog`: `trailSystemId`, `trailSystem` relation (trailId FK already existed)
- Extend `User`: `conditionReports` relation
- Run `prisma generate` and `tsc --noEmit`

### Task 2 — Actions
- `reportCondition.ts` — server action to submit a condition report and update trail's current condition
- `logRide.ts` — new server action with trailId + trailSystemId support

### Task 3 — Tests
- Vitest unit tests for `reportCondition`

### Task 4 — Components
- `ConditionBadge.tsx` — coloured badge showing condition type and report date
- `ConditionReportForm.tsx` — client form using `useActionState` to submit condition

### Task 5 — Trail Comparison
- `TrailCompareView.tsx` — side-by-side table comparing two trails

### Task 6 — Queries + Page Integration
- Add `getRegions()` and `getRecentConditionReports()` to `queries.ts`
- Update trail detail page to show condition badge and report form

### Task 7 — Barrel exports
- Export new components from `src/modules/trails/components/index.ts` and `src/modules/trails/index.ts`

### Task 8 — Verify
- `tsc --noEmit` passes
- `vitest run src/modules/trails` passes
- Commit

## Decision Notes
- `ConditionType` is a new enum independent of the existing `TrailCondition` enum (which uses different values for DB-level trail state); `ConditionType` is for rider-reported real-time conditions
- `RideLog.trailId` already existed in the schema — only `trailSystemId` is being added
- `logRide.ts` renames the exported function to `logTrailRide` to avoid collision with any future `logRide` in other modules
