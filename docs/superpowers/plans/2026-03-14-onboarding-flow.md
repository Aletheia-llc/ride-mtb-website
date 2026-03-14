# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-step URL-based onboarding wizard that collects new users' profiles and ends with a personalized welcome card recommending a course, community, and trail.

**Architecture:** URL-based wizard at `/onboarding/[step]` (steps 1–5) plus `/onboarding/complete`. Each step saves to the database via a server action (enabling cross-device resume). The dashboard guard is the sole enforcement point — new users hitting `/dashboard` with `onboardingCompletedAt = null` are redirected to `/onboarding`. All `/onboarding/*` routes call `requireAuth()`.

**Tech Stack:** Next.js 15.5 App Router, Prisma v7 + PostgreSQL (Supabase), NextAuth v5, Zod, Tailwind CSS v4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-14-onboarding-flow-design.md`

---

## File Map

**New files:**
- `src/app/onboarding/layout.tsx` — clean full-page layout, no sidebar
- `src/app/onboarding/page.tsx` — index redirect to current step
- `src/app/onboarding/[step]/page.tsx` — server component: step renderer + order guard
- `src/app/onboarding/complete/page.tsx` — server component: derives recommendations + renders WelcomeCard
- `src/modules/onboarding/lib/recommendations.ts` — pure async: user profile → `{ course, community, trail }`
- `src/modules/onboarding/lib/__tests__/recommendations.test.ts`
- `src/modules/onboarding/actions/saveStep.ts` — server action: validate, save, advance step
- `src/modules/onboarding/actions/__tests__/saveStep.test.ts`
- `src/modules/onboarding/actions/completeOnboarding.ts` — server action: set `onboardingCompletedAt`
- `src/modules/onboarding/actions/__tests__/completeOnboarding.test.ts`
- `src/modules/onboarding/components/OnboardingShell.tsx` — layout: progress bar + step counter + skip buttons
- `src/modules/onboarding/components/steps/Step1Username.tsx`
- `src/modules/onboarding/components/steps/Step2YourRide.tsx`
- `src/modules/onboarding/components/steps/Step3AboutYou.tsx`
- `src/modules/onboarding/components/steps/Step4Experience.tsx`
- `src/modules/onboarding/components/steps/Step5Interests.tsx`
- `src/modules/onboarding/components/WelcomeCard.tsx`

**Modified files:**
- `prisma/schema.prisma` — add `onboardingStep` and `onboardingCompletedAt` to `User`
- `src/lib/auth/types.ts` — add fields to all three declaration blocks
- `src/lib/auth/config.ts` — add fields to session callback
- `src/app/dashboard/page.tsx` — add onboarding redirect guard

---

## Chunk 1: Schema + Auth Foundation

### Task 1: Schema fields + DB push

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields to User model**

In `prisma/schema.prisma`, find the `bannedAt DateTime?` line (~line 29) in the User model. Add the two new fields immediately after:

```prisma
  bannedAt              DateTime?
  onboardingStep        Int       @default(1)
  onboardingCompletedAt DateTime?
```

- [ ] **Step 2: Push schema to production DB**

```bash
cd /Users/kylewarner/Documents/ride-mtb
DATABASE_URL="postgresql://postgres.ulvnbvmtzzqruaaozhrr:end%40vyj_azt9jgb%2AVDA@aws-1-us-west-1.pooler.supabase.com:5432/postgres" npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

Note: Use `aws-1-` (session pooler, port 5432), not `aws-0-`.

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client (vX.X.X) into ./src/generated/prisma/client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma src/generated/
git commit -m "feat(onboarding): add onboardingStep and onboardingCompletedAt to User schema"
```

---

### Task 2: Extend auth types + session callback

**Files:**
- Modify: `src/lib/auth/types.ts`
- Modify: `src/lib/auth/config.ts`

- [ ] **Step 1: Update types.ts**

Replace the entire contents of `src/lib/auth/types.ts` with:

```typescript
import 'next-auth'
import '@auth/core/adapters'

type Role = 'user' | 'instructor' | 'admin'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
      bannedAt?: Date | null
      onboardingCompletedAt?: Date | null
      onboardingStep?: number
    }
  }

  interface User {
    role?: Role
    bannedAt?: Date | null
    onboardingCompletedAt?: Date | null
    onboardingStep?: number
  }
}

declare module '@auth/core/adapters' {
  interface AdapterUser {
    role?: Role
    bannedAt?: Date | null
    onboardingCompletedAt?: Date | null
    onboardingStep?: number
  }
}
```

- [ ] **Step 2: Update session callback in config.ts**

In `src/lib/auth/config.ts`, add two lines after `session.user.bannedAt = user.bannedAt ?? null`:

```typescript
callbacks: {
  async session({ session, user }) {
    if (session.user) {
      session.user.id = user.id
      session.user.role = user.role ?? 'user'
      session.user.bannedAt = user.bannedAt ?? null
      session.user.onboardingCompletedAt = user.onboardingCompletedAt ?? null
      session.user.onboardingStep = user.onboardingStep ?? 1
    }
    return session
  },
},
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/types.ts src/lib/auth/config.ts
git commit -m "feat(onboarding): add onboardingStep and onboardingCompletedAt to session"
```

---

### Task 3: Dashboard onboarding guard

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add redirect guard after requireAuth()**

In `src/app/dashboard/page.tsx`, add `redirect` to the imports and add a guard after `requireAuth()`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'  // ← add redirect
import { requireAuth } from '@/lib/auth/guards'
// ... other imports ...

export default async function DashboardPage() {
  const sessionUser = await requireAuth()

  // Redirect users who haven't completed onboarding
  if (!sessionUser.onboardingCompletedAt) {
    redirect('/onboarding')
  }

  // ... rest of existing page code unchanged ...
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(onboarding): redirect incomplete onboarding users from dashboard"
```

---

## Chunk 2: Route Infrastructure

### Task 4: Onboarding layout + index redirect

**Files:**
- Create: `src/app/onboarding/layout.tsx`
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create clean layout**

```typescript
// src/app/onboarding/layout.tsx
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {children}
    </div>
  )
}
```

This intentionally excludes the sidebar and mega-nav present in other layouts.

- [ ] **Step 2: Create index redirect page**

```typescript
// src/app/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'

export default async function OnboardingPage() {
  const user = await requireAuth()

  if (user.onboardingCompletedAt) {
    redirect('/dashboard')
  }

  redirect(`/onboarding/${user.onboardingStep ?? 1}`)
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/layout.tsx src/app/onboarding/page.tsx
git commit -m "feat(onboarding): add layout and index redirect"
```

---

### Task 5: Step server component + complete page

**Files:**
- Create: `src/app/onboarding/[step]/page.tsx`
- Create: `src/app/onboarding/complete/page.tsx`

- [ ] **Step 1: Create step page**

```typescript
// src/app/onboarding/[step]/page.tsx
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { Step1Username } from '@/modules/onboarding/components/steps/Step1Username'
import { Step2YourRide } from '@/modules/onboarding/components/steps/Step2YourRide'
import { Step3AboutYou } from '@/modules/onboarding/components/steps/Step3AboutYou'
import { Step4Experience } from '@/modules/onboarding/components/steps/Step4Experience'
import { Step5Interests } from '@/modules/onboarding/components/steps/Step5Interests'

interface Props {
  params: Promise<{ step: string }>
}

export default async function OnboardingStepPage({ params }: Props) {
  const { step: stepParam } = await params
  const stepNum = parseInt(stepParam, 10)

  if (isNaN(stepNum) || stepNum < 1 || stepNum > 5) {
    redirect('/onboarding')
  }

  const user = await requireAuth()

  if (user.onboardingCompletedAt) {
    redirect('/dashboard')
  }

  const currentStep = user.onboardingStep ?? 1

  // Enforce step order
  if (stepNum !== currentStep) {
    redirect(`/onboarding/${currentStep}`)
  }

  // Fetch profile for pre-fill
  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      username: true,
      ridingStyle: true,
      skillLevel: true,
      bio: true,
      location: true,
      yearsRiding: true,
      favoriteBike: true,
      favoriteTrail: true,
      interests: true,
    },
  })

  switch (stepNum) {
    case 1:
      return <Step1Username defaultUsername={profile.username ?? ''} />
    case 2:
      return (
        <Step2YourRide
          defaultRidingStyle={profile.ridingStyle ?? ''}
          defaultSkillLevel={profile.skillLevel ?? null}
        />
      )
    case 3:
      return (
        <Step3AboutYou
          defaultBio={profile.bio ?? ''}
          defaultLocation={profile.location ?? ''}
        />
      )
    case 4:
      return (
        <Step4Experience
          defaultYearsRiding={profile.yearsRiding ?? null}
          defaultFavoriteBike={profile.favoriteBike ?? ''}
          defaultFavoriteTrail={profile.favoriteTrail ?? ''}
        />
      )
    case 5:
      return <Step5Interests defaultInterests={profile.interests} />
    default:
      redirect('/onboarding')
  }
}
```

Note: The step components are imported here but won't exist until Task 9. TypeScript will error until then — this is expected. Create the file now and the errors will resolve as components are added.

- [ ] **Step 2: Create complete page**

```typescript
// src/app/onboarding/complete/page.tsx
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getRecommendations } from '@/modules/onboarding/lib/recommendations'
import { WelcomeCard } from '@/modules/onboarding/components/WelcomeCard'

export default async function OnboardingCompletePage() {
  const user = await requireAuth()

  // Fetch profile from DB — do NOT use session value here, as the session may be
  // stale immediately after completeOnboarding() is called client-side.
  const profile = await db.user.findUniqueOrThrow({
    where: { id: user.id },
  })

  // Guard: must have completed onboarding (check DB, not session)
  if (!profile.onboardingCompletedAt) {
    redirect('/onboarding')
  }

  const { course, community, trail } = await getRecommendations(profile)

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <WelcomeCard
        userName={profile.name ?? profile.username ?? 'Rider'}
        course={course}
        community={community}
        trail={trail}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit (imports will resolve as modules are added in later tasks)**

```bash
git add src/app/onboarding/
git commit -m "feat(onboarding): add step route and complete page"
```

---

## Chunk 3: Business Logic

### Task 6: recommendations.ts (TDD)

**Files:**
- Create: `src/modules/onboarding/lib/__tests__/recommendations.test.ts`
- Create: `src/modules/onboarding/lib/recommendations.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/modules/onboarding/lib/__tests__/recommendations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRecommendations } from '../recommendations'
import { db } from '@/lib/db/client'

vi.mock('@/lib/db/client', () => ({
  db: {
    learnCourse: { findFirst: vi.fn() },
    forumCategory: { findFirst: vi.fn(), findUnique: vi.fn() },
    trailSystem: { findFirst: vi.fn() },
  },
}))

type UserInput = Parameters<typeof getRecommendations>[0]

function makeUser(overrides: Partial<UserInput> = {}): UserInput {
  return {
    skillLevel: null,
    interests: [],
    location: null,
    ...overrides,
  } as UserInput
}

const mockCourse = { id: 'c1', title: 'Beginner Basics', slug: 'beginner-basics', difficulty: 'beginner' }
const mockCommunity = { id: 'cat1', name: 'General Discussion', slug: 'general-discussion' }
const mockTrail = { id: 't1', name: 'Whistler Bike Park', trailCount: 120, slug: 'whistler' }

beforeEach(() => vi.clearAllMocks())

describe('getRecommendations', () => {
  it('queries courses by beginner difficulty for beginner skill level', async () => {
    vi.mocked(db.learnCourse.findFirst).mockResolvedValueOnce(mockCourse as never)
    vi.mocked(db.forumCategory.findUnique).mockResolvedValueOnce(mockCommunity as never)
    vi.mocked(db.trailSystem.findFirst).mockResolvedValueOnce(mockTrail as never)

    await getRecommendations(makeUser({ skillLevel: 'beginner' }))

    expect(db.learnCourse.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ difficulty: 'beginner' }) })
    )
  })

  it('maps expert skill level to advanced difficulty', async () => {
    vi.mocked(db.learnCourse.findFirst).mockResolvedValueOnce(mockCourse as never)
    vi.mocked(db.forumCategory.findUnique).mockResolvedValueOnce(mockCommunity as never)
    vi.mocked(db.trailSystem.findFirst).mockResolvedValueOnce(mockTrail as never)

    await getRecommendations(makeUser({ skillLevel: 'expert' }))

    expect(db.learnCourse.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ difficulty: 'advanced' }) })
    )
  })

  it('falls back to first published course when skill-level query returns no match', async () => {
    // beginner is provided but no beginner course exists in DB
    vi.mocked(db.learnCourse.findFirst)
      .mockResolvedValueOnce(null)               // skill-level query returns nothing
      .mockResolvedValueOnce(mockCourse as never) // fallback query
    vi.mocked(db.forumCategory.findUnique).mockResolvedValueOnce(mockCommunity as never)
    vi.mocked(db.trailSystem.findFirst).mockResolvedValueOnce(mockTrail as never)

    const result = await getRecommendations(makeUser({ skillLevel: 'beginner' }))

    expect(result.course).toBe(mockCourse)
    expect(db.learnCourse.findFirst).toHaveBeenCalledTimes(2)
  })

  it('maps Forum interest to general-discussion slug', async () => {
    vi.mocked(db.learnCourse.findFirst).mockResolvedValueOnce(mockCourse as never)
    vi.mocked(db.forumCategory.findUnique).mockResolvedValueOnce(mockCommunity as never)
    vi.mocked(db.trailSystem.findFirst).mockResolvedValueOnce(mockTrail as never)

    await getRecommendations(makeUser({ interests: ['Forum'] }))

    expect(db.forumCategory.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'general-discussion' } })
    )
  })

  it('falls back to general-discussion when interests is empty', async () => {
    vi.mocked(db.learnCourse.findFirst).mockResolvedValueOnce(mockCourse as never)
    vi.mocked(db.forumCategory.findUnique).mockResolvedValueOnce(null)
    vi.mocked(db.forumCategory.findFirst).mockResolvedValueOnce(mockCommunity as never)
    vi.mocked(db.trailSystem.findFirst).mockResolvedValueOnce(mockTrail as never)

    const result = await getRecommendations(makeUser({ interests: [] }))

    expect(db.forumCategory.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'general-discussion' } })
    )
    expect(result.community).toBe(mockCommunity)
  })

  it('queries trail by location city when location is set', async () => {
    vi.mocked(db.learnCourse.findFirst).mockResolvedValueOnce(mockCourse as never)
    vi.mocked(db.forumCategory.findUnique).mockResolvedValueOnce(mockCommunity as never)
    vi.mocked(db.trailSystem.findFirst).mockResolvedValueOnce(mockTrail as never)

    await getRecommendations(makeUser({ location: 'Whistler, BC' }))

    expect(db.trailSystem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          city: expect.objectContaining({ contains: 'Whistler' }),
        }),
      })
    )
  })

  it('falls back to highest trailCount system when no location', async () => {
    vi.mocked(db.learnCourse.findFirst).mockResolvedValueOnce(mockCourse as never)
    vi.mocked(db.forumCategory.findUnique).mockResolvedValueOnce(mockCommunity as never)
    vi.mocked(db.trailSystem.findFirst).mockResolvedValueOnce(mockTrail as never)

    await getRecommendations(makeUser({ location: null }))

    expect(db.trailSystem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { trailCount: 'desc' } })
    )
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx vitest run src/modules/onboarding/lib/__tests__/recommendations.test.ts
```

Expected: FAIL — `Cannot find module '../recommendations'`

- [ ] **Step 3: Implement recommendations.ts**

```typescript
// src/modules/onboarding/lib/recommendations.ts
import { db } from '@/lib/db/client'
import type { SkillLevel } from '@/generated/prisma/client'

const SKILL_TO_DIFFICULTY: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
  expert: 'advanced',
}

const INTEREST_TO_SLUG: Record<string, string> = {
  Forum: 'general-discussion',
  Learn: 'education',
  Trails: 'trails',
  Marketplace: 'marketplace',
  Bikes: 'bikes',
}

interface UserProfile {
  skillLevel: SkillLevel | null
  interests: string[]
  location: string | null
}

export async function getRecommendations(user: UserProfile) {
  // Course: match by skill level → difficulty, fall back to first published
  const difficulty = user.skillLevel ? SKILL_TO_DIFFICULTY[user.skillLevel] : undefined
  let course = difficulty
    ? await db.learnCourse.findFirst({
        where: { difficulty, status: 'published' },
        orderBy: { sortOrder: 'asc' },
      })
    : null
  if (!course) {
    course = await db.learnCourse.findFirst({
      where: { status: 'published' },
      orderBy: { createdAt: 'asc' },
    })
  }

  // Community: map first interest to category slug, fall back to general-discussion
  const slug =
    user.interests.length > 0
      ? (INTEREST_TO_SLUG[user.interests[0]] ?? 'general-discussion')
      : 'general-discussion'
  let community = await db.forumCategory.findUnique({ where: { slug } })
  if (!community) {
    community = await db.forumCategory.findFirst({ orderBy: { sortOrder: 'asc' } })
  }

  // Trail: match by location city/state, fall back to most trails
  let trail = null
  if (user.location) {
    const parts = user.location.split(',').map((s) => s.trim())
    const city = parts[0] ?? ''
    const state = parts[1]
    trail = await db.trailSystem.findFirst({
      where: {
        city: { contains: city, mode: 'insensitive' },
        ...(state ? { state } : {}),
      },
    })
  }
  if (!trail) {
    trail = await db.trailSystem.findFirst({ orderBy: { trailCount: 'desc' } })
  }

  return { course, community, trail }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/modules/onboarding/lib/__tests__/recommendations.test.ts
```

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/onboarding/lib/
git commit -m "feat(onboarding): add getRecommendations with tests"
```

---

### Task 7: saveStep action (TDD)

**Files:**
- Create: `src/modules/onboarding/actions/__tests__/saveStep.test.ts`
- Create: `src/modules/onboarding/actions/saveStep.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/modules/onboarding/actions/__tests__/saveStep.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: { user: { findUnique: vi.fn(), update: vi.fn() } },
}))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: vi.fn() }))

import { saveStep } from '../saveStep'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { rateLimit } from '@/lib/rate-limit'

const mockSessionUser = { id: 'user-1', role: 'user' as const, bannedAt: null, onboardingCompletedAt: null, onboardingStep: 1 }
const INITIAL = { errors: {} as Record<string, string> }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(mockSessionUser as never)
  vi.mocked(rateLimit).mockResolvedValue(undefined)
  vi.mocked(db.user.update).mockResolvedValue({} as never)
})

describe('saveStep — step 1 (username)', () => {
  it('saves username and advances step to 2', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null) // username available

    const fd = new FormData()
    fd.append('username', 'shredder99')

    const result = await saveStep(1, INITIAL, fd)

    expect(result.success).toBe(true)
    expect(result.errors).toEqual({})
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { username: 'shredder99', onboardingStep: 2 },
    })
  })

  it('returns username error when name is already taken', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: 'other-user' } as never)

    const fd = new FormData()
    fd.append('username', 'taken_name')

    const result = await saveStep(1, INITIAL, fd)

    expect(result.errors.username).toBe('Username already taken')
    expect(result.success).toBeUndefined()
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('returns validation error for username that is too short', async () => {
    const fd = new FormData()
    fd.append('username', 'ab')

    const result = await saveStep(1, INITIAL, fd)

    expect(result.errors.username).toBeDefined()
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('advances step without saving when form is empty (skip)', async () => {
    const result = await saveStep(1, INITIAL, new FormData())

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { onboardingStep: 2 },
    })
    // No username field in the update
    const call = vi.mocked(db.user.update).mock.calls[0][0]
    expect((call.data as Record<string, unknown>).username).toBeUndefined()
  })
})

describe('saveStep — step 2 (riding style + skill level)', () => {
  it('saves ridingStyle and skillLevel and advances to step 3', async () => {
    const fd = new FormData()
    fd.append('ridingStyle', 'Trail')
    fd.append('skillLevel', 'intermediate')

    const result = await saveStep(2, INITIAL, fd)

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { ridingStyle: 'Trail', skillLevel: 'intermediate', onboardingStep: 3 },
    })
  })
})

describe('saveStep — step 5 (interests)', () => {
  it('saves interests array and advances to step 6', async () => {
    const fd = new FormData()
    fd.append('interests', 'Forum')
    fd.append('interests', 'Trails')

    const result = await saveStep(5, INITIAL, fd)

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { interests: ['Forum', 'Trails'], onboardingStep: 6 },
    })
  })

  it('advances without saving when no interests are selected (skip)', async () => {
    const result = await saveStep(5, INITIAL, new FormData())

    expect(result.success).toBe(true)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { onboardingStep: 6 },
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/modules/onboarding/actions/__tests__/saveStep.test.ts
```

Expected: FAIL — `Cannot find module '../saveStep'`

- [ ] **Step 3: Implement saveStep.ts**

```typescript
// src/modules/onboarding/actions/saveStep.ts
'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db/client'

export type SaveStepState = {
  errors: Record<string, string>
  success?: boolean
}

// ── Per-step schemas ───────────────────────────────────────────

const step1Schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes'),
})

const step2Schema = z.object({
  ridingStyle: z.string().max(100).optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
})

const step3Schema = z.object({
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  location: z.string().max(100, 'Location must be at most 100 characters').optional(),
})

const step4Schema = z.object({
  yearsRiding: z.coerce.number().int().min(0).max(100).optional().or(z.literal('')),
  favoriteBike: z.string().max(100).optional(),
  favoriteTrail: z.string().max(100).optional(),
})

const step5Schema = z.object({
  interests: z.array(z.string()).optional(),
})

const schemas = {
  1: step1Schema,
  2: step2Schema,
  3: step3Schema,
  4: step4Schema,
  5: step5Schema,
} as const

// ── Action ─────────────────────────────────────────────────────

export async function saveStep(
  step: 1 | 2 | 3 | 4 | 5,
  _prevState: SaveStepState,
  formData: FormData,
): Promise<SaveStepState> {
  try {
    const user = await requireAuth()
    await rateLimit({ userId: user.id, action: 'onboarding-save', maxPerMinute: 20 })

    // Build raw data from FormData
    const raw: Record<string, unknown> = {}
    let hasData = false

    if (step === 5) {
      const interests = formData.getAll('interests').map(String).filter(Boolean)
      raw.interests = interests
      hasData = interests.length > 0
    } else {
      for (const [key, value] of formData.entries()) {
        const strVal = value.toString().trim()
        if (strVal) {
          raw[key] = strVal
          hasData = true
        }
      }
    }

    // Skip: empty submission — advance step without saving field data
    if (!hasData) {
      await db.user.update({
        where: { id: user.id },
        data: { onboardingStep: step + 1 },
      })
      return { errors: {}, success: true }
    }

    // Validate
    const schema = schemas[step] as z.ZodTypeAny
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      return { errors: fieldErrors }
    }

    // Step 1: check username uniqueness
    if (step === 1 && parsed.data.username) {
      const existing = await db.user.findUnique({
        where: { username: parsed.data.username },
        select: { id: true },
      })
      if (existing && existing.id !== user.id) {
        return { errors: { username: 'Username already taken' } }
      }
    }

    // Normalise step 4: drop empty yearsRiding string
    const data: Record<string, unknown> = { ...parsed.data }
    if (step === 4 && data.yearsRiding === '') {
      delete data.yearsRiding
    }

    await db.user.update({
      where: { id: user.id },
      data: { ...data, onboardingStep: step + 1 },
    })

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return { errors: { general: error.message } }
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/modules/onboarding/actions/__tests__/saveStep.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/onboarding/actions/saveStep.ts src/modules/onboarding/actions/__tests__/saveStep.test.ts
git commit -m "feat(onboarding): add saveStep server action with tests"
```

---

### Task 8: completeOnboarding action (TDD)

**Files:**
- Create: `src/modules/onboarding/actions/__tests__/completeOnboarding.test.ts`
- Create: `src/modules/onboarding/actions/completeOnboarding.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/modules/onboarding/actions/__tests__/completeOnboarding.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: { user: { findUniqueOrThrow: vi.fn(), update: vi.fn() } },
}))
vi.mock('../../lib/recommendations', () => ({
  getRecommendations: vi.fn(),
}))

import { completeOnboarding } from '../completeOnboarding'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getRecommendations } from '../../lib/recommendations'

const mockProfile = {
  id: 'user-1',
  skillLevel: 'beginner',
  interests: ['Forum'],
  location: 'Bend, OR',
  onboardingCompletedAt: null,
}

const mockRecs = {
  course: { id: 'c1', title: 'Beginner Basics' },
  community: { id: 'cat1', slug: 'general-discussion' },
  trail: { id: 't1', name: 'Deschutes' },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as never)
  vi.mocked(db.user.findUniqueOrThrow).mockResolvedValue(mockProfile as never)
  vi.mocked(db.user.update).mockResolvedValue({} as never)
  vi.mocked(getRecommendations).mockResolvedValue(mockRecs as never)
})

describe('completeOnboarding', () => {
  it('sets onboardingCompletedAt to current timestamp', async () => {
    const before = Date.now()
    await completeOnboarding()
    const after = Date.now()

    const call = vi.mocked(db.user.update).mock.calls[0][0]
    const completedAt = (call.data as { onboardingCompletedAt: Date }).onboardingCompletedAt
    expect(completedAt).toBeInstanceOf(Date)
    expect(completedAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(completedAt.getTime()).toBeLessThanOrEqual(after)
  })

  it('calls getRecommendations with the user profile', async () => {
    await completeOnboarding()
    expect(getRecommendations).toHaveBeenCalledWith(mockProfile)
  })

  it('returns the recommendations object', async () => {
    const result = await completeOnboarding()
    expect(result).toEqual(mockRecs)
  })

  it('is idempotent — does not overwrite if already completed', async () => {
    vi.mocked(db.user.findUniqueOrThrow).mockResolvedValueOnce({
      ...mockProfile,
      onboardingCompletedAt: new Date('2026-01-01'),
    } as never)

    await completeOnboarding()

    expect(db.user.update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/modules/onboarding/actions/__tests__/completeOnboarding.test.ts
```

Expected: FAIL — `Cannot find module '../completeOnboarding'`

- [ ] **Step 3: Implement completeOnboarding.ts**

```typescript
// src/modules/onboarding/actions/completeOnboarding.ts
'use server'

import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { getRecommendations } from '../lib/recommendations'

export async function completeOnboarding() {
  const user = await requireAuth()

  const profile = await db.user.findUniqueOrThrow({ where: { id: user.id } })

  // Idempotent: only set completion date if not already done
  if (!profile.onboardingCompletedAt) {
    await db.user.update({
      where: { id: user.id },
      data: { onboardingCompletedAt: new Date() },
    })
  }

  return getRecommendations(profile)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/modules/onboarding/actions/__tests__/completeOnboarding.test.ts
```

Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/onboarding/actions/completeOnboarding.ts src/modules/onboarding/actions/__tests__/completeOnboarding.test.ts
git commit -m "feat(onboarding): add completeOnboarding action with tests"
```

---

## Chunk 4: UI Components

### Task 9: OnboardingShell

**Files:**
- Create: `src/modules/onboarding/components/OnboardingShell.tsx`

- [ ] **Step 1: Create OnboardingShell**

```typescript
// src/modules/onboarding/components/OnboardingShell.tsx
'use client'

import { useRouter } from 'next/navigation'
import { completeOnboarding } from '../actions/completeOnboarding'

interface OnboardingShellProps {
  step: number
  totalSteps?: number
  onSkip: () => void
  children: React.ReactNode
}

export function OnboardingShell({
  step,
  totalSteps = 5,
  onSkip,
  children,
}: OnboardingShellProps) {
  const router = useRouter()

  async function handleSkipSetup() {
    await completeOnboarding()
    router.push('/onboarding/complete')
  }

  const progress = (step / totalSteps) * 100

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-[var(--color-border)]">
        <div
          className="h-full bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Step counter */}
          <p className="mb-6 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            Step {step} of {totalSteps}
          </p>

          {/* Step content */}
          {children}

          {/* Skip controls */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              Skip this step
            </button>
            <button
              type="button"
              onClick={handleSkipSetup}
              className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              Skip setup →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/onboarding/components/OnboardingShell.tsx
git commit -m "feat(onboarding): add OnboardingShell with progress bar and skip controls"
```

---

### Task 10: Step components 1–5

All step components follow the same pattern as `RideLogForm.tsx`:
- `useActionState<SaveStepState, FormData>(saveStep.bind(null, N), { errors: {} })`
- `useEffect` watching `state.success` for navigation
- `handleSkip` calls `action(new FormData())`

**Files:**
- Create: `src/modules/onboarding/components/steps/Step1Username.tsx`
- Create: `src/modules/onboarding/components/steps/Step2YourRide.tsx`
- Create: `src/modules/onboarding/components/steps/Step3AboutYou.tsx`
- Create: `src/modules/onboarding/components/steps/Step4Experience.tsx`
- Create: `src/modules/onboarding/components/steps/Step5Interests.tsx`

- [ ] **Step 1: Create Step1Username.tsx**

```typescript
// src/modules/onboarding/components/steps/Step1Username.tsx
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Button } from '@/ui/components'
import { saveStep, type SaveStepState } from '../../actions/saveStep'
import { OnboardingShell } from '../OnboardingShell'

interface Props {
  defaultUsername: string
}

export function Step1Username({ defaultUsername }: Props) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 1),
    { errors: {} },
  )

  useEffect(() => {
    if (state.success) router.push('/onboarding/2')
  }, [state.success, router])

  return (
    <OnboardingShell step={1} onSkip={() => action(new FormData())}>
      <form action={action} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Pick your username</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            This is how others will see you in the community.
          </p>
        </div>

        {state.errors.general && (
          <p className="text-sm text-red-500">{state.errors.general}</p>
        )}

        <Input
          label="Username"
          name="username"
          placeholder="shredder99"
          defaultValue={defaultUsername}
          maxLength={50}
          error={state.errors.username}
        />

        <Button type="submit" loading={isPending} className="w-full">
          Continue
        </Button>
      </form>
    </OnboardingShell>
  )
}
```

- [ ] **Step 2: Create Step2YourRide.tsx**

```typescript
// src/modules/onboarding/components/steps/Step2YourRide.tsx
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/ui/components'
import { saveStep, type SaveStepState } from '../../actions/saveStep'
import { OnboardingShell } from '../OnboardingShell'
import type { SkillLevel } from '@/generated/prisma/client'

const RIDING_STYLES = ['Trail', 'Enduro', 'Downhill', 'XC', 'Gravel', 'Dirt Jump', 'E-MTB']

const SKILL_LEVELS: Array<{ value: SkillLevel; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
]

interface Props {
  defaultRidingStyle: string
  defaultSkillLevel: SkillLevel | null
}

export function Step2YourRide({ defaultRidingStyle, defaultSkillLevel }: Props) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 2),
    { errors: {} },
  )

  useEffect(() => {
    if (state.success) router.push('/onboarding/3')
  }, [state.success, router])

  return (
    <OnboardingShell step={2} onSkip={() => action(new FormData())}>
      <form action={action} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">What's your ride?</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Tell us how you like to ride.
          </p>
        </div>

        {state.errors.general && (
          <p className="text-sm text-red-500">{state.errors.general}</p>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-text)]">Riding style</p>
          <div className="flex flex-wrap gap-2">
            {RIDING_STYLES.map((style) => (
              <label key={style} className="cursor-pointer">
                <input
                  type="radio"
                  name="ridingStyle"
                  value={style}
                  defaultChecked={defaultRidingStyle === style}
                  className="sr-only peer"
                />
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors peer-checked:border-[var(--color-primary)] peer-checked:bg-[var(--color-primary)]/10 peer-checked:text-[var(--color-primary)]">
                  {style}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-text)]">Skill level</p>
          <div className="grid grid-cols-2 gap-2">
            {SKILL_LEVELS.map(({ value, label }) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="skillLevel"
                  value={value}
                  defaultChecked={defaultSkillLevel === value}
                  className="sr-only peer"
                />
                <span className="block rounded-lg border border-[var(--color-border)] p-3 text-center text-sm text-[var(--color-text-muted)] transition-colors peer-checked:border-[var(--color-primary)] peer-checked:bg-[var(--color-primary)]/10 peer-checked:text-[var(--color-primary)]">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" loading={isPending} className="w-full">
          Continue
        </Button>
      </form>
    </OnboardingShell>
  )
}
```

- [ ] **Step 3: Create Step3AboutYou.tsx**

```typescript
// src/modules/onboarding/components/steps/Step3AboutYou.tsx
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Button } from '@/ui/components'
import { saveStep, type SaveStepState } from '../../actions/saveStep'
import { OnboardingShell } from '../OnboardingShell'

interface Props {
  defaultBio: string
  defaultLocation: string
}

export function Step3AboutYou({ defaultBio, defaultLocation }: Props) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 3),
    { errors: {} },
  )

  useEffect(() => {
    if (state.success) router.push('/onboarding/4')
  }, [state.success, router])

  return (
    <OnboardingShell step={3} onSkip={() => action(new FormData())}>
      <form action={action} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">About you</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Help others get to know you.
          </p>
        </div>

        {state.errors.general && (
          <p className="text-sm text-red-500">{state.errors.general}</p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">Bio</label>
          <textarea
            name="bio"
            rows={4}
            maxLength={500}
            defaultValue={defaultBio}
            placeholder="Tell us about yourself..."
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          {state.errors.bio && <p className="text-xs text-red-500">{state.errors.bio}</p>}
        </div>

        <Input
          label="Location"
          name="location"
          placeholder="Bend, OR"
          defaultValue={defaultLocation}
          maxLength={100}
          error={state.errors.location}
        />

        <Button type="submit" loading={isPending} className="w-full">
          Continue
        </Button>
      </form>
    </OnboardingShell>
  )
}
```

- [ ] **Step 4: Create Step4Experience.tsx**

```typescript
// src/modules/onboarding/components/steps/Step4Experience.tsx
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Button } from '@/ui/components'
import { saveStep, type SaveStepState } from '../../actions/saveStep'
import { OnboardingShell } from '../OnboardingShell'

interface Props {
  defaultYearsRiding: number | null
  defaultFavoriteBike: string
  defaultFavoriteTrail: string
}

export function Step4Experience({
  defaultYearsRiding,
  defaultFavoriteBike,
  defaultFavoriteTrail,
}: Props) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 4),
    { errors: {} },
  )

  useEffect(() => {
    if (state.success) router.push('/onboarding/5')
  }, [state.success, router])

  return (
    <OnboardingShell step={4} onSkip={() => action(new FormData())}>
      <form action={action} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Your experience</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Share your riding history.
          </p>
        </div>

        {state.errors.general && (
          <p className="text-sm text-red-500">{state.errors.general}</p>
        )}

        <Input
          label="Years riding"
          name="yearsRiding"
          type="number"
          min={0}
          max={100}
          placeholder="5"
          defaultValue={defaultYearsRiding?.toString() ?? ''}
          error={state.errors.yearsRiding}
        />

        <Input
          label="Favourite bike"
          name="favoriteBike"
          placeholder="Trek Slash 9.9"
          defaultValue={defaultFavoriteBike}
          maxLength={100}
          error={state.errors.favoriteBike}
        />

        <Input
          label="Favourite trail"
          name="favoriteTrail"
          placeholder="A-Line, Whistler"
          defaultValue={defaultFavoriteTrail}
          maxLength={100}
          error={state.errors.favoriteTrail}
        />

        <Button type="submit" loading={isPending} className="w-full">
          Continue
        </Button>
      </form>
    </OnboardingShell>
  )
}
```

- [ ] **Step 5: Create Step5Interests.tsx**

```typescript
// src/modules/onboarding/components/steps/Step5Interests.tsx
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/ui/components'
import { saveStep, type SaveStepState } from '../../actions/saveStep'
import { completeOnboarding } from '../../actions/completeOnboarding'
import { OnboardingShell } from '../OnboardingShell'

const INTERESTS = [
  { value: 'Forum', label: 'Forum', description: 'Discussions & community' },
  { value: 'Learn', label: 'Learn', description: 'Courses & skills' },
  { value: 'Trails', label: 'Trails', description: 'Trail maps & reviews' },
  { value: 'Marketplace', label: 'Marketplace', description: 'Buy & sell gear' },
  { value: 'Bikes', label: 'Bikes', description: 'Bike selector & reviews' },
]

interface Props {
  defaultInterests: string[]
}

export function Step5Interests({ defaultInterests }: Props) {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveStepState, FormData>(
    saveStep.bind(null, 5),
    { errors: {} },
  )

  useEffect(() => {
    if (state.success) {
      completeOnboarding()
        .then(() => router.push('/onboarding/complete'))
        .catch(() => router.push('/onboarding/complete')) // navigate even if recs fail
    }
  }, [state.success, router])

  return (
    <OnboardingShell step={5} onSkip={() => action(new FormData())}>
      <form action={action} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            What are you here for?
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Select everything that interests you.
          </p>
        </div>

        {state.errors.general && (
          <p className="text-sm text-red-500">{state.errors.general}</p>
        )}

        <div className="space-y-2">
          {INTERESTS.map(({ value, label, description }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 transition-colors has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary)]/5"
            >
              <input
                type="checkbox"
                name="interests"
                value={value}
                defaultChecked={defaultInterests.includes(value)}
                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
              </div>
            </label>
          ))}
        </div>

        <Button type="submit" loading={isPending} className="w-full">
          Finish setup
        </Button>
      </form>
    </OnboardingShell>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/onboarding/components/steps/
git commit -m "feat(onboarding): add step components 1–5"
```

---

### Task 11: WelcomeCard

**Files:**
- Create: `src/modules/onboarding/components/WelcomeCard.tsx`

- [ ] **Step 1: Create WelcomeCard.tsx**

```typescript
// src/modules/onboarding/components/WelcomeCard.tsx
import Link from 'next/link'
import { Card, Button } from '@/ui/components'
import { ArrowRight } from 'lucide-react'
import type { LearnCourse, ForumCategory, TrailSystem } from '@/generated/prisma/client'

interface WelcomeCardProps {
  userName: string
  course: LearnCourse | null
  community: ForumCategory | null
  trail: TrailSystem | null
}

export function WelcomeCard({ userName, course, community, trail }: WelcomeCardProps) {
  return (
    <div className="w-full max-w-lg space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--color-text)]">
          Welcome to Ride MTB, {userName}!
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          We put together a few recommendations to get you started.
        </p>
      </div>

      <div className="space-y-4">
        {course && (
          <Card>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              Recommended Course
            </p>
            <h3 className="font-semibold text-[var(--color-text)]">{course.title}</h3>
            {course.description && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)] line-clamp-2">
                {course.description}
              </p>
            )}
            <Link href={`/learn/courses/${course.slug}`}>
              <Button size="sm" className="mt-4 w-full">
                Start learning
              </Button>
            </Link>
          </Card>
        )}

        {community && (
          <Card>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              Community
            </p>
            <h3 className="font-semibold text-[var(--color-text)]">{community.name}</h3>
            {community.description && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {community.description}
              </p>
            )}
            <Link href={`/forum/categories/${community.slug}`}>
              <Button size="sm" variant="secondary" className="mt-4 w-full">
                Join the conversation
              </Button>
            </Link>
          </Card>
        )}

        {trail && (
          <Card>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              Trail System
            </p>
            <h3 className="font-semibold text-[var(--color-text)]">{trail.name}</h3>
            {trail.description && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)] line-clamp-2">
                {trail.description}
              </p>
            )}
            <Link href={`/trails/systems/${trail.slug}`}>
              <Button size="sm" variant="secondary" className="mt-4 w-full">
                Explore trails
              </Button>
            </Link>
          </Card>
        )}
      </div>

      <div className="text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          Go to dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/onboarding/components/WelcomeCard.tsx
git commit -m "feat(onboarding): add WelcomeCard component"
```

---

## Chunk 5: Final Verification

### Task 12: Build + test + smoke test

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx vitest run
```

Expected: All tests pass, including new onboarding tests (recommendations: 6, saveStep: 7, completeOnboarding: 4)

- [ ] **Step 2: TypeScript build check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Start dev server and smoke test manually**

```bash
npm run dev
```

Open http://localhost:3000 and test these scenarios:

1. **New user flow**: Sign in via Google OAuth as a user with `onboardingCompletedAt = null`. Should land at `/onboarding/1`.
2. **Dashboard guard**: Navigate directly to `/dashboard` as incomplete user. Should redirect to `/onboarding`.
3. **Step navigation**: Fill step 1 username → Continue → lands on `/onboarding/2`.
4. **Per-step skip**: Click "Skip this step" on step 2 → advances to `/onboarding/3`.
5. **Step order guard**: Navigate directly to `/onboarding/4` when on step 3 → redirects to `/onboarding/3`.
6. **Skip setup**: Click "Skip setup →" from any step → completes onboarding → lands on `/onboarding/complete`.
7. **Welcome card**: Verify course, community, and trail are shown with CTAs.
8. **Post-completion redirect**: Navigate to `/onboarding` after completing → redirects to `/dashboard`.
9. **Complete page guard**: Navigate to `/onboarding/complete` before completing → redirects to `/onboarding`.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(onboarding): complete onboarding flow — all tests pass"
```
