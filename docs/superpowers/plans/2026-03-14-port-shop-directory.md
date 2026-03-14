# Plan: Port Shop Directory into Ride MTB Monolith

**Date:** 2026-03-14
**Branch:** agent-a311160b

## Overview

Port the standalone `ride-mtb-shop-directory` into the monolith at `/src/modules/shops` and `/src/app/shops`. The standalone had a full shop directory with reviews, photos, hours, map, and partner tiers. The monolith currently has a basic Shop model (no reviews/hours/types) and 2 pages (list, detail).

## Changes

### Task 1 — Schema additions
- Add `ShopType` and `PartnerTier` enums
- Add `ShopPhoto`, `ShopReview`, `ReviewHelpful` models
- Add new fields to `Shop`: shopType, partnerTier, hoursJson, photos[], reviews[], avg ratings, reviewCount
- Add back-relations to `User`: shopReviews[], reviewHelpfulVotes[]
- Run `prisma generate` (no db push)

### Task 2 — Server Actions
- `src/modules/shops/actions/submitShopReview.ts` — create review + update shop aggregates
- `src/modules/shops/actions/markReviewHelpful.ts` — toggle helpful vote

### Task 3 — Tests
- `src/modules/shops/actions/submitShopReview.test.ts` — 3 unit tests (success, duplicate, validation)

### Task 4 — Components
- `ShopReviewSection.tsx` — review list + write-review form (4-axis ratings)
- `ShopHoursTable.tsx` — hours table with open/closed indicator

### Task 5 — Map page
- `src/modules/shops/components/ShopsMapClient.tsx` — Mapbox GL client component
- `src/app/shops/map/page.tsx` — server page that fetches shop pins

### Task 6 — Wire up detail page
- Add `getShopReviews` and `getShopWithDetails` to queries.ts
- Update `[slug]/page.tsx` to fetch reviews and pass them to ShopReviewSection
- Update `ShopDetail` to render hours table

### Task 7 — Barrel + nav
- Export new components from `src/modules/shops/components/index.ts`
- Add "Map" link to shop list page header

### Task 8 — Type-check and commit
- `npx tsc --noEmit`
- `npx vitest run src/modules/shops`
- Commit

## Notes
- Use `lat`/`lng` field names NOT `latitude`/`longitude` — wait, the existing schema uses `latitude`/`longitude`. Keep consistent with existing field names.
- Don't run `prisma db push`
- ESLint: add `// eslint-disable-next-line no-restricted-imports` before db client imports in modules/shops/
