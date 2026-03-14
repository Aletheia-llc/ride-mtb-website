# Plan: Port Bike Garage Standalone → Ride MTB Monolith

**Date:** 2026-03-14
**Branch:** worktree-agent-a7d99ffe

## Goal

Add component tracking, build log timeline, and maintenance scheduler to the existing `src/modules/bikes/` module. Skip Strava OAuth and photo gallery (handled separately).

## What Exists

- `prisma/schema.prisma`: `UserBike`, `BikeServiceLog` models
- `src/modules/bikes/lib/garage-queries.ts`: CRUD helpers
- `src/modules/bikes/actions/`: addBike, deleteBike, updateBike, logService, deleteServiceLog
- `src/modules/bikes/components/garage/`: BikeCard, BikeForm, GarageView, ServiceLogForm, ServiceLogList, etc.
- `src/app/bikes/garage/[bikeId]/page.tsx`: Detail page with service history + edit form

## Task Plan

### 1. Schema additions
- Add `BikeComponentCategory` enum (FRAME, FORK, SHOCK, WHEELS, DRIVETRAIN, BRAKES, COCKPIT, SEATPOST, SADDLE, PEDALS, OTHER)
- Add `BikeComponent` model with weight/price/brand/model/installedAt/removedAt/isActive
- Add `BuildLogEntry` model with title/description/imageUrl/entryDate
- Add `MaintenanceInterval` enum (MILES, DAYS, HOURS)
- Add `MaintenanceTask` model with intervalType/intervalValue/lastCompletedAt/isDue
- Extend `UserBike` with frameMaterial, travel, purchaseYear, purchasePrice, and relations
- Run `prisma generate` (NOT db push)

### 2. Server Actions
- `addComponent.ts` — validate + create BikeComponent, verify bike ownership
- `removeComponent.ts` — soft delete (isActive=false, removedAt=now)
- `addBuildLogEntry.ts` — validate + create BuildLogEntry
- `manageMaintenance.ts` — createMaintenanceTask + completeMaintenanceTask

### 3. Tests
- `addComponent.test.ts` — vitest with mocked db + auth

### 4. UI Components
- `ComponentTable.tsx` — table of active components + inline add form
- `BuildLogTimeline.tsx` — chronological timeline + add form
- `MaintenanceList.tsx` — task list with "Mark Done" buttons

### 5. Update Bike Detail Page
- Add `getBikeWithDetails` query to `garage-queries.ts`
- Update `src/app/bikes/garage/[bikeId]/page.tsx` with tabs (Overview / Components / Build Log / Maintenance)

### 6. Verify
- `npx tsc --noEmit`
- `npx vitest run src/modules/bikes`
- Commit
