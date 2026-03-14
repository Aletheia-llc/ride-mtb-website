# Onboarding Flow Design

**Date:** 2026-03-14

## Goal

Give new users a structured, skippable wizard immediately after first sign-in that collects their profile, tracks progress cross-device, and ends with a personalized welcome card recommending a course, a forum community, and a trail.

## Current State

No onboarding flow exists. New users sign in with Google and land directly on the dashboard with an empty profile. The `User` model already has all the relevant fields (`username`, `bio`, `location`, `ridingStyle`, `skillLevel`, `yearsRiding`, `favoriteBike`, `favoriteTrail`, `interests`) but nothing prompts users to fill them in.

## Architecture

A URL-based wizard at `/onboarding/[step]` (steps 1–5) plus a `/onboarding/complete` page. Each step advance saves to the database via a server action, enabling true cross-device resume. Two new fields on `User` track progress. The dashboard layout gates unauthenticated and incomplete-onboarding users. The wizard has a clean layout (no sidebar, no mega-nav) with per-step skip and a global "Skip setup" exit.

---

## Schema Changes

Add two fields to the `User` model in `prisma/schema.prisma`:

```prisma
onboardingStep        Int       @default(1)   // step to resume at (1–5); 6 = completed
onboardingCompletedAt DateTime?               // null = not finished
```

Also add both fields to all three declaration blocks in `src/lib/auth/types.ts` — `Session.user`, `User`, and `AdapterUser` — and populate them in the session callback in `src/lib/auth/config.ts` (same pattern as `role` and `bannedAt`).

---

## Routes

| Route | Purpose |
|---|---|
| `/onboarding` | Redirects to `/onboarding/[onboardingStep]` |
| `/onboarding/[step]` | Renders step 1–5; server component validates step matches user's current step |
| `/onboarding/complete` | Personalized welcome card; guards against direct access before completion |

**Onboarding redirect:**

The `/dashboard/page.tsx` guard is the sole enforcement point. After sign-in, NextAuth redirects to `callbackUrl` (default: `/dashboard`). The dashboard guard checks `session.user.onboardingCompletedAt` — if null, it redirects to `/onboarding`. This catches both new users arriving from OAuth and returning users who navigate directly to `/dashboard`.

Note: Neither the `redirect` callback (receives only `{ url, baseUrl }`, no user) nor the `signIn` callback (receives OAuth profile payload, not DB-hydrated user — PrismaAdapter does not hydrate custom fields like `onboardingCompletedAt` in `signIn`) can reliably check this field. The `session` callback is the correct place to surface DB fields onto the session object, and the dashboard guard reads from there.

All `/onboarding/*` routes call `requireAuth()` and redirect to `/signin` if unauthenticated.

Users who navigate directly to `/forum`, `/learn`, etc. before completing onboarding are **not** blocked — they can explore the platform freely. The wizard is opt-out, not a hard gate.

---

## The Five Steps

| Step | Route | Fields collected |
|---|---|---|
| 1 | `/onboarding/1` | `username` |
| 2 | `/onboarding/2` | `ridingStyle`, `skillLevel` |
| 3 | `/onboarding/3` | `bio`, `location` |
| 4 | `/onboarding/4` | `yearsRiding`, `favoriteBike`, `favoriteTrail` |
| 5 | `/onboarding/5` | `interests` (checkboxes: Forum, Learn, Trails, Marketplace, Bikes) |

---

## File Structure

```
src/app/onboarding/
  layout.tsx              — clean full-page layout, no sidebar, no mega-nav
  page.tsx                — server component; redirects to /onboarding/[onboardingStep]
  [step]/page.tsx         — server component; renders correct step, guards step order
  complete/page.tsx       — server component; guards access, renders WelcomeCard

src/modules/onboarding/
  components/
    OnboardingShell.tsx   — progress bar, step counter ("Step 2 of 5"), Skip + Skip setup buttons
    steps/
      Step1Username.tsx   — client component, username input with uniqueness check
      Step2YourRide.tsx   — client component, riding style + skill level selectors
      Step3AboutYou.tsx   — client component, bio textarea + location input
      Step4Experience.tsx — client component, years riding + favorite bike + favorite trail
      Step5Interests.tsx  — client component, interest checkboxes
    WelcomeCard.tsx       — displays recommended course, community, and trail
  actions/
    saveStep.ts           — saves step fields + advances onboardingStep; handles skip (empty data)
    completeOnboarding.ts — sets onboardingCompletedAt, returns recommendations object
  lib/
    recommendations.ts    — pure function: takes user profile, returns { course, community, trail }
```

---

## Data Flow

Each step page is a server component that fetches the current user and passes their existing field values (pre-fills forms for users who are resuming). The step component is a `'use client'` form. On submit, it calls `saveStep(step, data)` — a server action that:

1. Validates input (Zod)
2. Updates the relevant `User` fields
3. Increments `onboardingStep` to `step + 1`
4. Returns `{ success: true }` or `{ errors: {...} }`

On success, the client uses `router.push('/onboarding/[step+1]')` (or `/onboarding/complete` after step 5).

After step 5, the client calls `completeOnboarding()` which sets `onboardingCompletedAt = now()` and returns `{ course, community, trail }` for the welcome card.

---

## Skip Behavior

- **"Skip" button** on each step: calls `saveStep(step, {})` — advances `onboardingStep` without saving any field data. The user moves to the next step.
- **"Skip setup" link** (visible on every step): calls `completeOnboarding()` with whatever has been saved so far, then navigates to `/onboarding/complete`. The user sees the welcome card with whatever recommendations can be derived, then proceeds to the dashboard.

---

## Personalized Welcome Card

`recommendations.ts` takes the user's saved profile and returns three suggestions:

**Course (`LearnCourse`):**
- Query `LearnCourse` matching the user's `skillLevel` mapped to `difficulty`. `LearnCourse` has no `ridingStyle` field — skill level is the only filter. Explicit mapping (all four `SkillLevel` values):
  - `beginner → beginner`
  - `intermediate → intermediate`
  - `advanced → advanced`
  - `expert → advanced`
- Fallback: first available course ordered by `createdAt` if no match

**Community (`ForumCategory`):**
- Map the first item in `interests[]` to a `ForumCategory` slug (e.g., `"Forum"` → `"general-discussion"`, `"Trails"` → `"trails"`)
- Fallback: `"general-discussion"`

**Trail (`TrailSystem`):**
- If `location` is set: query nearest `TrailSystem` by city/state string match
- Fallback: first `TrailSystem` ordered by `trailCount DESC` (`TrailSystem` has no `featured` field)

The welcome card displays all three with a CTA each, plus a "Go to dashboard" button.

---

## Auth Integration

`src/lib/auth/config.ts` — `session` callback additions (same pattern as `role` and `bannedAt`):
```typescript
session.user.onboardingCompletedAt = user.onboardingCompletedAt ?? null
session.user.onboardingStep = user.onboardingStep ?? 1
```

`src/lib/auth/types.ts` — add to all three declaration blocks (`Session.user`, `User`, `AdapterUser`):
```typescript
onboardingCompletedAt?: Date | null
onboardingStep?: number
```

---

## Error Handling

- **Username taken:** `saveStep` returns `{ errors: { username: 'Username already taken' } }` — form shows inline error, step does not advance
- **Direct navigation to wrong step:** Server component compares URL step param against `user.onboardingStep` — redirects to the correct step
- **Direct navigation to `/onboarding/complete` before finishing:** Server component checks `onboardingCompletedAt !== null` — redirects to `/onboarding` if not set
- **No course match:** `recommendations.ts` falls back to first available course, never returns null
- **Already completed onboarding:** Visiting `/onboarding` redirects to `/dashboard`

---

## Testing

- `saveStep`: test each step saves correct fields, advances `onboardingStep`, skipping advances without saving
- `saveStep` username conflict: returns field error, does not advance step
- `completeOnboarding`: sets `onboardingCompletedAt`, returns `{ course, community, trail }` with valid values
- `recommendations.ts`: beginner trail rider → correct course; no match → fallback course; no interests → fallback community
- Dashboard redirect: unauthenticated → `/signin`; `onboardingCompletedAt = null` → `/onboarding`; completed → passes through
- Step guard: navigating to `/onboarding/4` when `onboardingStep = 2` → redirects to `/onboarding/2`

---

## Out of Scope

- Email/password sign-up (Google OAuth only for now)
- Onboarding analytics / funnel tracking
- Avatar upload during onboarding (can be done later in profile settings)
- Re-triggering onboarding after completion (users edit profile via `/profile/settings`)
