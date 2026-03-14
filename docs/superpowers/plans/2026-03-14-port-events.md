# Port Events: Race Calendar into Ride MTB Monolith

**Date:** 2026-03-14
**Branch:** worktree-agent-a96be765

## What we're adding

The standalone `ride-mtb-events-race-calendar` had rich event tooling the monolith lacks. This port adds:

1. **Schema** — `EventType` enum expansion, `EventComment` (threaded replies), `OrganizerProfile`, plus new fields on `Event` (organizer, registration, cost, featured, results)
2. **Actions** — `createEventComment` (with threaded `parentId`), `createOrganizerProfile`
3. **Tests** — Vitest unit tests for `createEventComment` covering top-level, threaded, not-found, and empty-body cases
4. **Components** — `EventCommentSection` (threaded UI), `EventCountdownBadge` (live countdown), `CalendarView` (month grid), `OrganizerDashboard` (event management)
5. **Routes** — `/events/calendar` (calendar page), `/events/organizer` (dashboard with auth gate), `/events/organizer/setup` (new organizer form)
6. **Wiring** — Event detail page fetches and renders comments; events list page gains Calendar View link; `queries.ts` gets `getEventComments`

## Tasks

- [x] Task 1: Schema additions (EventType enum expansion, EventComment, OrganizerProfile, Event new fields)
- [x] Task 2: Server actions (createEventComment, createOrganizerProfile)
- [x] Task 3: Vitest tests for createEventComment
- [x] Task 4: Components (EventCommentSection, EventCountdownBadge, CalendarView, OrganizerDashboard)
- [x] Task 5: New routes (calendar, organizer, organizer/setup)
- [x] Task 6: Wire EventDetail page (comments + countdown), events list (Calendar View link), queries.ts
- [x] Task 7: Type-check, tests, commit

## Key design notes

- `EventType` enum in schema becomes `EventTypeEnum` field on `Event` to avoid clash with existing `eventType: EventType` string field (which stays for backward compatibility)
- `OrganizerProfile` links via `organizerId` on `Event` (optional — not all events have organizer profiles)
- `EventComment` self-references via `parentId` for single-level threading (replies only on top-level comments)
- All server actions use `requireAuth()` guard and `// eslint-disable-next-line no-restricted-imports` before db client import
