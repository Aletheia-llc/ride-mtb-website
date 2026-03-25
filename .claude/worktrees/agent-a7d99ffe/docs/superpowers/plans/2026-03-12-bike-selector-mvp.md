# Bike Selector MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Bike Selector by adding quiz persistence, results pages, consultation booking, and brand data.

**Architecture:** The quiz flow (`BikeQuizFlow`) and spectrum algorithm (`computeSpectrumCategory`) already exist. This plan layers in DB persistence (QuizSession → QuizAnswer → QuizResult), dedicated results/history pages backed by the Zustand store and API, a consultation modal, brand links component, seed data for categories and brands, and a mega-nav update. All new code lives in `src/modules/bikes/` and `src/app/bikes/selector/`. The `XpEvent` enum and `grantXP` engine already work — we add a `bike_quiz_completed` event.

**Tech Stack:** Next.js 15.5, Prisma v7 + PrismaAdapter, PostgreSQL (Supabase), NextAuth v5 (`auth()` from `@/lib/auth/config`), Tailwind CSS v4, Zustand v5 (persist key `ride-mtb-quiz-v3`), existing XP engine (`src/modules/xp/lib/engine.ts`).

**Working directory for all commands:** `/Users/kylewarner/Documents/ride-mtb` (not the worktree — run migrations against the live project root).

---

## Task 1: DB Schema + Migration

**Files to modify:**
- `prisma/schema.prisma`

**Files generated:**
- `prisma/migrations/[timestamp]_add_bike_selector_models/migration.sql`

- [ ] **Step 1: Add `bike_quiz_completed` to the `XpEvent` enum**

In `prisma/schema.prisma`, find the `XpEvent` enum block and add the new event:

```prisma
enum XpEvent {
  forum_post_created
  forum_thread_created
  forum_vote_received
  learn_quiz_completed
  learn_quiz_improved
  learn_module_completed
  learn_course_completed
  trail_review_submitted
  trail_condition_reported
  trail_photo_uploaded
  trail_gpx_contributed
  ride_logged
  review_submitted
  event_attended
  streak_bonus
  listing_created
  listing_favorited
  bike_quiz_completed   // ADD THIS LINE
}
```

- [ ] **Step 2: Add six new models after the `// BIKE GARAGE` section (after `BikeServiceLog`)**

Insert this block between `BikeServiceLog` closing brace and `// MEDIA`:

```prisma
model QuizSession {
  id           String      @id @default(cuid())
  userId       String?
  user         User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  sessionToken String      @unique @default(cuid())
  answers      QuizAnswer[]
  result       QuizResult?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([userId])
  @@index([sessionToken])
  @@map("quiz_sessions")
}

model QuizAnswer {
  id          String      @id @default(cuid())
  sessionId   String
  session     QuizSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  stepKey     String
  answerValue Json
  createdAt   DateTime    @default(now())

  @@unique([sessionId, stepKey])
  @@index([sessionId])
  @@map("quiz_answers")
}

model QuizResult {
  id               String      @id @default(cuid())
  sessionId        String      @unique
  session          QuizSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId           String?
  user             User?       @relation(fields: [userId], references: [id], onDelete: SetNull)
  primaryCategory  Int
  rawScore         Float
  categoryName     String
  resultJson       Json
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@index([userId])
  @@index([createdAt])
  @@map("quiz_results")
}

model BikeSpectrumCategory {
  id                     String   @id @default(cuid())
  categoryNumber         Int      @unique
  categoryName           String
  categoryDescription    String
  travelRange            String?
  recommendedWheelConfig String
  recommendedSizes       Json
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@map("bike_spectrum_categories")
}

model BikeBrand {
  id        String           @id @default(cuid())
  slug      String           @unique
  name      String
  website   String?
  logoUrl   String?
  models    BikeBrandModel[]
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@map("bike_brands")
}

model BikeBrandModel {
  id             String    @id @default(cuid())
  brandId        String
  brand          BikeBrand @relation(fields: [brandId], references: [id], onDelete: Cascade)
  categoryNumber Int
  modelName      String
  priceRange     String?
  productUrl     String?
  availableSizes Json
  keySpecs       Json?
  imageUrl       String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([brandId, categoryNumber, modelName])
  @@index([brandId])
  @@index([categoryNumber])
  @@map("bike_brand_models")
}

model BikeConsultationRequest {
  id                String   @id @default(cuid())
  userId            String?
  user              User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  name              String
  email             String
  phone             String?
  ridingGoals       String
  specificQuestions String?
  budgetRange       String?
  quizSessionId     String?
  status            String   @default("pending")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
  @@index([status])
  @@map("bike_consultation_requests")
}
```

- [ ] **Step 3: Add relations to the User model**

Find the line `coachProfile    CoachProfile?` in the User model and add after it (before `@@map("users")`):

```prisma
  quizSessions        QuizSession[]
  quizResults         QuizResult[]
  bikeConsultations   BikeConsultationRequest[]
```

- [ ] **Step 4: Add `bike_quiz_completed` to `XP_VALUES` in shared constants**

In `src/shared/constants/xp-values.ts`, add to the `XP_VALUES` record:

```typescript
  bike_quiz_completed: 15,
```

- [ ] **Step 5: Run migration and regenerate client**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma migrate dev --name add_bike_selector_models
npx prisma generate
```

Expected: seven new tables created (`quiz_sessions`, `quiz_answers`, `quiz_results`, `bike_spectrum_categories`, `bike_brands`, `bike_brand_models`, `bike_consultation_requests`), Prisma client regenerated with new types.

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add prisma/schema.prisma prisma/migrations/ src/shared/constants/xp-values.ts src/generated/
git commit -m "feat(bikes): add quiz persistence + brand DB models + bike_quiz_completed XP event"
```

---

## Task 2: Quiz Submit API + Results API + Consultation API

**Files to create:**
- `src/app/api/bikes/quiz/submit/route.ts`
- `src/app/api/bikes/quiz/results/route.ts`
- `src/app/api/bikes/consultation/route.ts`

**Files to modify:**
- `src/modules/bikes/hooks/useQuizStore.ts` — add `sessionToken` field to persisted state
- `src/modules/bikes/components/BikeQuizFlow.tsx` — call submit API after computing result

### 2a — Quiz Submit Route

- [ ] **Create `src/app/api/bikes/quiz/submit/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { computeSpectrumCategory } from '@/modules/bikes/lib/spectrum'
import { grantXP } from '@/modules/xp/lib/engine'
import type { QuizAnswers } from '@/modules/bikes/types'

export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null

  const body = await request.json()
  const { answers, sessionToken } = body as { answers: QuizAnswers; sessionToken: string }

  if (!answers || !sessionToken) {
    return NextResponse.json({ error: 'Missing answers or sessionToken' }, { status: 400 })
  }

  const result = computeSpectrumCategory(answers)

  const quizSession = await db.quizSession.upsert({
    where: { sessionToken },
    create: {
      sessionToken,
      userId,
      answers: {
        createMany: {
          data: Object.entries(answers).map(([stepKey, answerValue]) => ({
            stepKey,
            answerValue: answerValue as object,
          })),
          skipDuplicates: true,
        },
      },
    },
    update: {
      userId,
    },
  })

  const quizResult = await db.quizResult.upsert({
    where: { sessionId: quizSession.id },
    create: {
      sessionId: quizSession.id,
      userId,
      primaryCategory: result.primaryCategory,
      rawScore: result.rawScore,
      categoryName: result.categoryName,
      resultJson: result as object,
    },
    update: {
      userId,
      primaryCategory: result.primaryCategory,
      rawScore: result.rawScore,
      categoryName: result.categoryName,
      resultJson: result as object,
    },
  })

  if (userId) {
    await grantXP({
      userId,
      event: 'bike_quiz_completed',
      module: 'bikes',
      refId: quizResult.id,
    }).catch(() => {
      // Ignore duplicate grant errors — XP already awarded for this result
    })
  }

  return NextResponse.json({ resultId: quizResult.id, sessionId: quizSession.id, result })
}
```

### 2b — Quiz Results History Route

- [ ] **Create `src/app/api/bikes/quiz/results/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await db.quizResult.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      primaryCategory: true,
      rawScore: true,
      categoryName: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ results })
}
```

### 2c — Consultation Route

- [ ] **Create `src/app/api/bikes/consultation/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id ?? null

  const body = await request.json()
  const { name, email, phone, ridingGoals, specificQuestions, budgetRange, quizSessionId } =
    body as {
      name: string
      email: string
      phone?: string
      ridingGoals: string
      specificQuestions?: string
      budgetRange?: string
      quizSessionId?: string
    }

  if (!name || !email || !ridingGoals) {
    return NextResponse.json({ error: 'name, email, and ridingGoals are required' }, { status: 400 })
  }

  const consultation = await db.bikeConsultationRequest.create({
    data: {
      userId,
      name,
      email,
      phone: phone ?? null,
      ridingGoals,
      specificQuestions: specificQuestions ?? null,
      budgetRange: budgetRange ?? null,
      quizSessionId: quizSessionId ?? null,
    },
  })

  return NextResponse.json({ id: consultation.id }, { status: 201 })
}
```

### 2d — Update useQuizStore to track sessionToken

- [ ] **Modify `src/modules/bikes/hooks/useQuizStore.ts`**

Add `sessionToken` to the `QuizState` interface and `initialState`, and reset it on `reset()`. The persist key is already `ride-mtb-quiz-v3` — do NOT bump it (adding a new optional field is backwards-compatible with the existing merge function).

Replace the entire file content with:

```typescript
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { QuizAnswers } from '../types'
import { TOTAL_STEPS } from '../lib/constants'

interface QuizState {
  currentStep: number
  answers: QuizAnswers
  isSubmitting: boolean
  sessionToken: string
  setAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  setSubmitting: (submitting: boolean) => void
  reset: () => void
}

const initialAnswers: QuizAnswers = {
  experience: '',
  terrain: [],
  ride_day: '',
  priorities: [],
  preferences: { pedaling_enjoyment: 5, budget: 5000, ebike: false },
  sizing: { height_inches: 70, weight_lbs: 170 },
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      currentStep: 1,
      answers: { ...initialAnswers },
      isSubmitting: false,
      sessionToken: nanoid(),
      setAnswer: (key, value) =>
        set((state) => ({ answers: { ...state.answers, [key]: value } })),
      nextStep: () =>
        set((state) => ({ currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS) })),
      prevStep: () =>
        set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      goToStep: (step) => set({ currentStep: Math.max(1, Math.min(step, TOTAL_STEPS)) }),
      setSubmitting: (submitting) => set({ isSubmitting: submitting }),
      reset: () =>
        set({ currentStep: 1, answers: { ...initialAnswers }, isSubmitting: false, sessionToken: nanoid() }),
    }),
    {
      name: 'ride-mtb-quiz-v3',
      merge: (persisted, current) => {
        const p = persisted as Partial<QuizState>
        const c = current as QuizState
        return {
          ...c,
          ...p,
          answers: { ...c.answers, ...p.answers },
          sessionToken: p.sessionToken ?? nanoid(),
        }
      },
    },
  ),
)
```

Note: `nanoid` is already a transitive dependency in the project. If it is not installed, run `npm install nanoid`.

### 2e — Update BikeQuizFlow to call the API and navigate to results page

- [ ] **Modify `src/modules/bikes/components/BikeQuizFlow.tsx`**

Replace the `handleSubmit` function and add a router import so that after a successful API call the user is pushed to `/bikes/selector/results`. Also add a `resultId` state field to redirect with the ID.

Replace the existing file with:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Bike } from 'lucide-react'
import { Button } from '@/ui/components'
import { ProgressBar } from '@/ui/components'
import { useQuizStore } from '../hooks/useQuizStore'
import { QUIZ_STEPS, TOTAL_STEPS } from '../lib/constants'
import { computeSpectrumCategory } from '../lib/spectrum'
import type { SpectrumResult } from '../types'
import { QuizStep } from './QuizStep'
import { ResultsView } from './ResultsView'

export function BikeQuizFlow() {
  const router = useRouter()
  const { currentStep, answers, isSubmitting, sessionToken, setAnswer, nextStep, prevStep, setSubmitting, reset } =
    useQuizStore()
  const [result, setResult] = useState<SpectrumResult | null>(null)

  const stepConfig = QUIZ_STEPS[currentStep - 1]

  const isStepValid = useCallback((): boolean => {
    switch (stepConfig?.key) {
      case 'experience':
        return answers.experience !== ''
      case 'terrain':
        return answers.terrain.length >= 1
      case 'ride_day':
        return answers.ride_day !== ''
      case 'priorities':
        return answers.priorities.length >= 1
      case 'preferences':
        return true // sliders always have a value
      case 'sizing':
        return answers.sizing.height_inches > 0 && answers.sizing.weight_lbs > 0
      default:
        return true
    }
  }, [stepConfig?.key, answers])

  function handleNext() {
    if (!isStepValid()) return
    if (currentStep === TOTAL_STEPS) {
      handleSubmit()
    } else {
      nextStep()
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const computed = computeSpectrumCategory(answers)
      setResult(computed)

      // Persist to DB (fire-and-forget with redirect on success)
      const res = await fetch('/api/bikes/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, sessionToken }),
      })

      if (res.ok) {
        const data = await res.json() as { resultId: string }
        router.push(`/bikes/selector/results/${data.resultId}`)
      }
      // If API fails, stay on page showing inline ResultsView fallback
    } catch {
      // Show inline result even if persistence failed
    } finally {
      setSubmitting(false)
    }
  }

  function handleRetake() {
    setResult(null)
    reset()
  }

  // Show inline results as fallback if API navigation hasn't fired yet
  if (result) {
    return (
      <div className="px-4 py-8">
        <ResultsView result={result} onRetake={handleRetake} />
      </div>
    )
  }

  // Quiz flow
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-[var(--color-primary)]">
          <Bike className="h-6 w-6" />
          <span className="text-sm font-medium uppercase tracking-wide">Bike Selector</span>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar
        value={currentStep}
        max={TOTAL_STEPS}
        label={`Step ${currentStep} of ${TOTAL_STEPS}`}
      />

      {/* Current step */}
      {stepConfig && (
        <QuizStep stepConfig={stepConfig} answers={answers} onAnswer={setAnswer} />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <Button
          variant="primary"
          onClick={handleNext}
          disabled={!isStepValid() || isSubmitting}
          loading={isSubmitting}
        >
          {currentStep === TOTAL_STEPS ? (
            <>
              See results
              <Bike className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit
```

- [ ] **Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/app/api/bikes/ src/modules/bikes/hooks/useQuizStore.ts src/modules/bikes/components/BikeQuizFlow.tsx
git commit -m "feat(bikes): add quiz submit/results/consultation API routes and wire submit flow"
```

---

## Task 3: Results Page + History Page

**Files to create:**
- `src/app/bikes/selector/results/page.tsx` — client, reads latest result from store (fallback)
- `src/app/bikes/selector/results/[id]/page.tsx` — server component, fetches QuizResult by id
- `src/app/bikes/selector/history/page.tsx` — auth-gated, lists past results
- `src/modules/bikes/components/QuizResults.tsx` — shared result renderer
- `src/modules/bikes/components/ResultsHistory.tsx` — history list

### 3a — QuizResults component

- [ ] **Create `src/modules/bikes/components/QuizResults.tsx`**

This replaces the inline `ResultsView` for the dedicated results pages, adding a consultation CTA and brand links placeholder.

```typescript
'use client'

import { Bike, RotateCcw, Calendar, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/ui/components'
import { Card } from '@/ui/components'
import { Badge } from '@/ui/components'
import type { SpectrumResult } from '../types'
import { CATEGORY_META } from '../lib/constants'
import { SpectrumDisplay } from './SpectrumDisplay'
import { ScoreBreakdown } from './ScoreBreakdown'
import { BrandLinks } from './BrandLinks'
import { ConsultationModal } from './ConsultationModal'
import { useState } from 'react'

interface QuizResultsProps {
  result: SpectrumResult
  resultId?: string
  quizSessionId?: string
  showRetake?: boolean
}

export function QuizResults({ result, resultId, quizSessionId, showRetake = true }: QuizResultsProps) {
  const router = useRouter()
  const [consultationOpen, setConsultationOpen] = useState(false)

  const categoryLabels = Object.fromEntries(
    Object.entries(CATEGORY_META).map(([k, v]) => [Number(k), { name: v.name }]),
  )

  function handleShare() {
    if (resultId) {
      const url = `${window.location.origin}/bikes/selector/results/${resultId}`
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <Badge variant="success" className="mb-3">
          <Bike className="mr-1 inline h-3 w-3" />
          Your match
        </Badge>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">{result.categoryName}</h1>
        <p className="mt-2 text-lg text-[var(--color-text-muted)]">{result.categoryDescription}</p>
      </div>

      {/* Spectrum */}
      <Card>
        <SpectrumDisplay value={result.rawScore} categories={categoryLabels} />
      </Card>

      {/* Key specs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {result.travelRange && (
          <Card className="text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Travel Range</p>
            <p className="mt-1 text-xl font-bold text-[var(--color-text)]">
              {result.travelRange.min}–{result.travelRange.max}mm
            </p>
          </Card>
        )}
        <Card className="text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Wheel Config</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{result.wheelConfig}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Frame Size</p>
          <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{result.recommendedSize}</p>
        </Card>
      </div>

      {/* Budget & E-bike */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="info">Budget: ${result.budget.toLocaleString()}</Badge>
        {result.ebike && <Badge variant="warning">E-Bike</Badge>}
      </div>

      {/* Why it matches */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Why this matches</h2>
        <ul className="flex flex-col gap-2">
          {result.whyMatches.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
              {reason}
            </li>
          ))}
        </ul>
      </Card>

      {/* Fit notes */}
      {result.fitNotes.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Fit notes</h2>
          <ul className="flex flex-col gap-2">
            {result.fitNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                {note}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Brand links */}
      <BrandLinks categoryNumber={result.primaryCategory} budget={result.budget} ebike={result.ebike} />

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Also consider</h2>
          <div className="flex flex-col gap-3">
            {result.alternatives.map((alt) => (
              <div
                key={alt.categoryNumber}
                className="rounded-lg border border-[var(--color-border)] p-3"
              >
                <div className="flex items-center gap-2">
                  <Badge>{alt.categoryName}</Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{alt.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Score breakdown */}
      <ScoreBreakdown breakdown={result.scoreBreakdown} />

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {showRetake && (
          <Button variant="secondary" onClick={() => router.push('/bikes/selector')}>
            <RotateCcw className="h-4 w-4" />
            Retake quiz
          </Button>
        )}
        {resultId && (
          <Button variant="secondary" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Share result
          </Button>
        )}
        <Button variant="primary" onClick={() => setConsultationOpen(true)}>
          <Calendar className="h-4 w-4" />
          Book a consultation
        </Button>
      </div>

      <ConsultationModal
        open={consultationOpen}
        onClose={() => setConsultationOpen(false)}
        quizSessionId={quizSessionId}
        budget={result.budget}
      />
    </div>
  )
}
```

### 3b — Results page (server — fetch by ID)

- [ ] **Create `src/app/bikes/selector/results/[id]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db/client'
import type { SpectrumResult } from '@/modules/bikes/types'
import { QuizResults } from '@/modules/bikes/components/QuizResults'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const result = await db.quizResult.findUnique({ where: { id }, select: { categoryName: true } })
  return {
    title: result ? `${result.categoryName} — Bike Selector | Ride MTB` : 'Bike Result | Ride MTB',
  }
}

export default async function BikeResultPage({ params }: Props) {
  const { id } = await params

  const quizResult = await db.quizResult.findUnique({
    where: { id },
    include: { session: true },
  })

  if (!quizResult) notFound()

  const result = quizResult.resultJson as SpectrumResult

  return (
    <div className="px-4 py-8">
      <QuizResults
        result={result}
        resultId={quizResult.id}
        quizSessionId={quizResult.sessionId}
        showRetake
      />
    </div>
  )
}
```

### 3c — Results index page (client fallback for non-persisted sessions)

- [ ] **Create `src/app/bikes/selector/results/page.tsx`**

This page handles the case where a user lands here without a result ID (e.g., shared link without ID, or navigated directly). It redirects to the selector.

```typescript
import { redirect } from 'next/navigation'

export default function BikeResultsIndexPage() {
  redirect('/bikes/selector')
}
```

### 3d — ResultsHistory component

- [ ] **Create `src/modules/bikes/components/ResultsHistory.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'
import { Card } from '@/ui/components'
import { Badge } from '@/ui/components'

interface HistoryEntry {
  id: string
  primaryCategory: number
  categoryName: string
  rawScore: number
  createdAt: string
}

interface ResultsHistoryProps {
  results: HistoryEntry[]
}

export function ResultsHistory({ results }: ResultsHistoryProps) {
  if (results.length === 0) {
    return (
      <Card>
        <div className="py-8 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-[var(--color-text-muted)]" />
          <p className="text-[var(--color-text-muted)]">No quiz results yet.</p>
          <Link
            href="/bikes/selector"
            className="mt-3 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Take the quiz
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((entry) => (
        <Link key={entry.id} href={`/bikes/selector/results/${entry.id}`}>
          <Card className="flex items-center justify-between gap-4 transition-colors hover:border-[var(--color-primary)]">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[var(--color-text)]">{entry.categoryName}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {new Date(entry.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge>Category {entry.primaryCategory}</Badge>
              <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
```

### 3e — History page (auth-gated server component)

- [ ] **Create `src/app/bikes/selector/history/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { ResultsHistory } from '@/modules/bikes/components/ResultsHistory'

export const metadata: Metadata = {
  title: 'My Quiz Results | Ride MTB',
}

export default async function BikeResultsHistoryPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/signin?callbackUrl=/bikes/selector/history')
  }

  const results = await db.quizResult.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      primaryCategory: true,
      categoryName: true,
      rawScore: true,
      createdAt: true,
    },
  })

  const serialized = results.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">My Quiz Results</h1>
      <ResultsHistory results={serialized} />
    </div>
  )
}
```

### 3f — Export new components from module index

- [ ] **Modify `src/modules/bikes/components/index.ts`**

Add the new exports:

```typescript
export { QuizResults } from './QuizResults'
export { ResultsHistory } from './ResultsHistory'
export { BrandLinks } from './BrandLinks'
export { ConsultationModal } from './ConsultationModal'
```

The full file should look like:

```typescript
export { BikeQuizFlow } from './BikeQuizFlow'
export { QuizStep } from './QuizStep'
export { ResultsView } from './ResultsView'
export { SpectrumDisplay } from './SpectrumDisplay'
export { ScoreBreakdown } from './ScoreBreakdown'
export { QuizResults } from './QuizResults'
export { ResultsHistory } from './ResultsHistory'
export { BrandLinks } from './BrandLinks'
export { ConsultationModal } from './ConsultationModal'
export {
  GarageView,
  BikeCard,
  BikeForm,
  ServiceLogList,
  ServiceLogForm,
  DeleteBikeButton,
} from './garage'
```

- [ ] **TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit
```

- [ ] **Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/app/bikes/selector/ src/modules/bikes/components/QuizResults.tsx src/modules/bikes/components/ResultsHistory.tsx src/modules/bikes/components/index.ts
git commit -m "feat(bikes): add results pages, history page, and QuizResults/ResultsHistory components"
```

---

## Task 4: Consultation Modal + Brand Links Component

**Files to create:**
- `src/modules/bikes/components/ConsultationModal.tsx`
- `src/modules/bikes/components/BrandLinks.tsx`

### 4a — ConsultationModal

- [ ] **Create `src/modules/bikes/components/ConsultationModal.tsx`**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send } from 'lucide-react'
import { Button } from '@/ui/components'

interface ConsultationModalProps {
  open: boolean
  onClose: () => void
  quizSessionId?: string
  budget?: number
}

interface FormState {
  name: string
  email: string
  phone: string
  ridingGoals: string
  specificQuestions: string
  budgetRange: string
}

export function ConsultationModal({ open, onClose, quizSessionId, budget }: ConsultationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultBudgetRange = budget
    ? `$${(budget - 500).toLocaleString()}–$${(budget + 500).toLocaleString()}`
    : ''

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    ridingGoals: '',
    specificQuestions: '',
    budgetRange: defaultBudgetRange,
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  function handleField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/bikes/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quizSessionId }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Submission failed')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog[open]:flex m-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl backdrop:bg-black/60"
      onClose={onClose}
    >
      <div className="flex w-full flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--color-text)]">Book a Consultation</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <p className="text-lg font-semibold text-[var(--color-text)]">Request received!</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              We&apos;ll reach out within 24 hours to schedule your consultation.
            </p>
            <Button variant="secondary" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-[var(--color-text)]">Name *</span>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => handleField('name', e.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-[var(--color-text)]">Email *</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => handleField('email', e.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--color-text)]">Phone (optional)</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleField('phone', e.target.value)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--color-text)]">Riding goals *</span>
              <textarea
                required
                rows={3}
                value={form.ridingGoals}
                onChange={(e) => handleField('ridingGoals', e.target.value)}
                placeholder="What do you want to improve or achieve?"
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--color-text)]">Specific questions (optional)</span>
              <textarea
                rows={2}
                value={form.specificQuestions}
                onChange={(e) => handleField('specificQuestions', e.target.value)}
                placeholder="Any specific questions about the recommended category?"
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--color-text)]">Budget range (optional)</span>
              <input
                type="text"
                value={form.budgetRange}
                onChange={(e) => handleField('budgetRange', e.target.value)}
                placeholder="e.g. $3,000–$5,000"
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
            </label>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>
              <Send className="h-4 w-4" />
              Send request
            </Button>
          </form>
        )}
      </div>
    </dialog>
  )
}
```

**Note on `<dialog>` CSS:** The project uses a known pitfall — `dialog[open]` must be used for display, not `dialog { display: flex }`. The class `dialog[open]:flex` in Tailwind v4 handles this correctly. Do not add a bare `display: flex` to the dialog element itself.

### 4b — BrandLinks component

This component renders a curated, static list of brand links by category. It does not hit the DB — it uses a hardcoded map that mirrors the seed data brands. This keeps it fast and avoids an extra round-trip on the results page.

- [ ] **Create `src/modules/bikes/components/BrandLinks.tsx`**

```typescript
import { ExternalLink } from 'lucide-react'
import { Card } from '@/ui/components'

interface BrandEntry {
  name: string
  url: string
  note?: string
}

// Curated static map — mirrors seed data; update when brands are added to DB
const BRAND_MAP: Record<number, BrandEntry[]> = {
  1: [
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/road-bikes/gravel-bikes/', note: 'Checkpoint series' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/gravel', note: 'Diverge / Crux' },
    { name: 'Canyon', url: 'https://www.canyon.com/en-us/gravel-bikes/', note: 'Grail series' },
  ],
  3: [
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/cross-country-mountain-bikes/', note: 'Procaliber / Supercaliber' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/xc', note: 'Epic series' },
    { name: 'Giant', url: 'https://www.giant-bicycles.com/us/bikes/mountain/xc', note: 'XTC / Anthem' },
    { name: 'Canyon', url: 'https://www.canyon.com/en-us/mountain-bikes/xc/', note: 'Lux / Exceed' },
  ],
  5: [
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/', note: 'Fuel EX / Remedy' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/trail', note: 'Stumpjumper' },
    { name: 'Giant', url: 'https://www.giant-bicycles.com/us/bikes/mountain/trail', note: 'Trance / Stance' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/bikes/trail', note: 'Tallboy / 5010' },
    { name: 'Yeti', url: 'https://www.yeticycles.com/bikes', note: 'SB120 / SB130' },
    { name: 'Canyon', url: 'https://www.canyon.com/en-us/mountain-bikes/trail/', note: 'Spectral / Neuron' },
  ],
  7: [
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/enduro-mountain-bikes/', note: 'Slash / Slash+' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/enduro', note: 'Enduro' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/bikes/enduro', note: 'Bronson / Megatower' },
    { name: 'Yeti', url: 'https://www.yeticycles.com/bikes', note: 'SB150 / SB160' },
    { name: 'Canyon', url: 'https://www.canyon.com/en-us/mountain-bikes/enduro/', note: 'Strive / Torque' },
  ],
  9: [
    { name: 'Trek', url: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/downhill-mountain-bikes/', note: 'Session' },
    { name: 'Specialized', url: 'https://www.specialized.com/us/en/bikes/mountain/downhill', note: 'Demo' },
    { name: 'Santa Cruz', url: 'https://www.santacruzbicycles.com/en-US/bikes/downhill', note: 'V10' },
    { name: 'Canyon', url: 'https://www.canyon.com/en-us/mountain-bikes/downhill/', note: 'Sender' },
  ],
}

interface BrandLinksProps {
  categoryNumber: number
  budget?: number
  ebike?: boolean
}

export function BrandLinks({ categoryNumber, ebike }: BrandLinksProps) {
  const brands = BRAND_MAP[categoryNumber] ?? []

  if (brands.length === 0) return null

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">
        Brands to explore
        {ebike && <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">(look for e- variants)</span>}
      </h2>
      <div className="flex flex-col gap-2">
        {brands.map((brand) => (
          <a
            key={brand.name}
            href={brand.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <span className="font-medium text-[var(--color-text)]">{brand.name}</span>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              {brand.note && <span className="text-xs">{brand.note}</span>}
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </a>
        ))}
      </div>
    </Card>
  )
}
```

- [ ] **TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit
```

- [ ] **Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/modules/bikes/components/ConsultationModal.tsx src/modules/bikes/components/BrandLinks.tsx
git commit -m "feat(bikes): add ConsultationModal and BrandLinks components"
```

---

## Task 5: Seed Data + Mega-nav Update + Deploy

**Files to create:**
- `prisma/seed-bikes.ts`

**Files to modify:**
- `src/ui/components/MegaNav/megaNavConfig.ts`
- `package.json` (prisma seed script, if not already pointing to a seed runner)

### 5a — Seed file

- [ ] **Create `prisma/seed-bikes.ts`**

```typescript
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding bike spectrum categories...')

  // Spectrum categories
  const categories = [
    {
      categoryNumber: 1,
      categoryName: 'Gravel / Road+',
      categoryDescription: 'Light, fast, and versatile. Built for gravel roads, bike paths, and light trail riding.',
      travelRange: '0–40mm',
      recommendedWheelConfig: '29/29',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
    {
      categoryNumber: 3,
      categoryName: 'Cross-Country',
      categoryDescription: 'Efficient climbing and quick handling. Ideal for XC racing and fast singletrack.',
      travelRange: '80–120mm',
      recommendedWheelConfig: '29/29',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
    {
      categoryNumber: 5,
      categoryName: 'Trail / All-Mountain',
      categoryDescription: 'The do-it-all category. Balanced climbing and descending for varied terrain.',
      travelRange: '120–150mm',
      recommendedWheelConfig: '29/29',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
    {
      categoryNumber: 7,
      categoryName: 'Enduro',
      categoryDescription: 'Gravity-focused with enough pedaling ability for big days. Built for steep, technical descents.',
      travelRange: '150–180mm',
      recommendedWheelConfig: '29/27.5',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
    {
      categoryNumber: 9,
      categoryName: 'Downhill',
      categoryDescription: 'Maximum suspension travel and stability for bike parks and shuttle-accessed terrain.',
      travelRange: '180–210mm',
      recommendedWheelConfig: '27.5/27.5',
      recommendedSizes: { XS: '58–63"', S: '63–67"', M: '67–71"', L: '71–75"', XL: '75–79"' },
    },
  ]

  for (const cat of categories) {
    await prisma.bikeSpectrumCategory.upsert({
      where: { categoryNumber: cat.categoryNumber },
      update: cat,
      create: cat,
    })
  }

  console.log('Seeding bike brands...')

  const brands = [
    { slug: 'trek', name: 'Trek', website: 'https://www.trekbikes.com' },
    { slug: 'specialized', name: 'Specialized', website: 'https://www.specialized.com' },
    { slug: 'giant', name: 'Giant', website: 'https://www.giant-bicycles.com' },
    { slug: 'santa-cruz', name: 'Santa Cruz', website: 'https://www.santacruzbicycles.com' },
    { slug: 'yeti', name: 'Yeti', website: 'https://www.yeticycles.com' },
    { slug: 'canyon', name: 'Canyon', website: 'https://www.canyon.com' },
  ]

  const brandIds: Record<string, string> = {}

  for (const brand of brands) {
    const b = await prisma.bikeBrand.upsert({
      where: { slug: brand.slug },
      update: brand,
      create: brand,
    })
    brandIds[brand.slug] = b.id
  }

  console.log('Seeding bike brand models...')

  const models: Array<{
    brandSlug: string
    categoryNumber: number
    modelName: string
    priceRange: string
    productUrl: string
    availableSizes: string[]
    keySpecs: Record<string, string>
  }> = [
    // Trek — Trail (5)
    { brandSlug: 'trek', categoryNumber: 5, modelName: 'Fuel EX 8', priceRange: '$3,299–$3,999', productUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/fuel-ex/fuel-ex-8/', availableSizes: ['S', 'M', 'ML', 'L', 'XL', 'XXL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'Alpha Platinum Aluminum' } },
    { brandSlug: 'trek', categoryNumber: 5, modelName: 'Fuel EX 9.8 GX', priceRange: '$5,999–$6,499', productUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/trail-mountain-bikes/fuel-ex/fuel-ex-9-8-gx/', availableSizes: ['S', 'M', 'ML', 'L', 'XL', 'XXL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'OCLV Mountain Carbon' } },
    // Trek — Enduro (7)
    { brandSlug: 'trek', categoryNumber: 7, modelName: 'Slash 8', priceRange: '$4,299–$4,799', productUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/enduro-mountain-bikes/slash/slash-8/', availableSizes: ['S', 'M', 'ML', 'L', 'XL', 'XXL'], keySpecs: { travel: '170mm rear / 180mm front', wheel: '29"', frame: 'Alpha Platinum Aluminum' } },
    // Trek — XC (3)
    { brandSlug: 'trek', categoryNumber: 3, modelName: 'Procaliber 9.6', priceRange: '$2,799', productUrl: 'https://www.trekbikes.com/us/en_US/bikes/mountain-bikes/cross-country-mountain-bikes/procaliber/procaliber-9-6/', availableSizes: ['S', 'M', 'L', 'XL', 'XXL'], keySpecs: { travel: '100mm front', wheel: '29"', frame: 'Alpha Platinum Aluminum' } },
    // Specialized — Trail (5)
    { brandSlug: 'specialized', categoryNumber: 5, modelName: 'Stumpjumper Comp', priceRange: '$3,700', productUrl: 'https://www.specialized.com/us/en/stumpjumper-comp/p/199470', availableSizes: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'M5 Alloy' } },
    { brandSlug: 'specialized', categoryNumber: 5, modelName: 'Stumpjumper Expert', priceRange: '$5,500', productUrl: 'https://www.specialized.com/us/en/stumpjumper-expert/p/199472', availableSizes: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'FACT 11m Carbon' } },
    // Specialized — Enduro (7)
    { brandSlug: 'specialized', categoryNumber: 7, modelName: 'Enduro Comp', priceRange: '$4,500', productUrl: 'https://www.specialized.com/us/en/enduro-comp/p/199476', availableSizes: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], keySpecs: { travel: '160mm rear / 170mm front', wheel: '29"', frame: 'M5 Alloy' } },
    // Giant — Trail (5)
    { brandSlug: 'giant', categoryNumber: 5, modelName: 'Trance X 29 2', priceRange: '$3,200', productUrl: 'https://www.giant-bicycles.com/us/trance-x-29-2', availableSizes: ['S', 'M', 'L', 'XL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'ALUXX SL Aluminum' } },
    // Giant — XC (3)
    { brandSlug: 'giant', categoryNumber: 3, modelName: 'XTC Advanced 29 2', priceRange: '$3,100', productUrl: 'https://www.giant-bicycles.com/us/xtc-advanced-29-2', availableSizes: ['S', 'M', 'L', 'XL'], keySpecs: { travel: '100mm front', wheel: '29"', frame: 'Advanced Grade Composite' } },
    // Santa Cruz — Trail (5)
    { brandSlug: 'santa-cruz', categoryNumber: 5, modelName: 'Tallboy 5 A', priceRange: '$3,599', productUrl: 'https://www.santacruzbicycles.com/en-US/tallboy', availableSizes: ['S', 'M', 'L', 'XL', 'XXL'], keySpecs: { travel: '120mm rear / 130mm front', wheel: '29"', frame: 'Aluminum' } },
    { brandSlug: 'santa-cruz', categoryNumber: 5, modelName: '5010 5 A', priceRange: '$3,199', productUrl: 'https://www.santacruzbicycles.com/en-US/5010', availableSizes: ['S', 'M', 'L', 'XL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '27.5"', frame: 'Aluminum' } },
    // Santa Cruz — Enduro (7)
    { brandSlug: 'santa-cruz', categoryNumber: 7, modelName: 'Megatower 2 A', priceRange: '$4,499', productUrl: 'https://www.santacruzbicycles.com/en-US/megatower', availableSizes: ['S', 'M', 'L', 'XL', 'XXL'], keySpecs: { travel: '160mm rear / 170mm front', wheel: '29"', frame: 'Aluminum' } },
    // Yeti — Trail (5)
    { brandSlug: 'yeti', categoryNumber: 5, modelName: 'SB130 C2', priceRange: '$5,799', productUrl: 'https://www.yeticycles.com/bikes/sb130', availableSizes: ['XS', 'S', 'M', 'L', 'XL'], keySpecs: { travel: '130mm rear / 140mm front', wheel: '29"', frame: 'C-Series Carbon' } },
    // Yeti — Enduro (7)
    { brandSlug: 'yeti', categoryNumber: 7, modelName: 'SB150 C2', priceRange: '$6,299', productUrl: 'https://www.yeticycles.com/bikes/sb150', availableSizes: ['XS', 'S', 'M', 'L', 'XL'], keySpecs: { travel: '150mm rear / 160mm front', wheel: '29"', frame: 'C-Series Carbon' } },
    // Canyon — Trail (5)
    { brandSlug: 'canyon', categoryNumber: 5, modelName: 'Spectral 125 CF 7', priceRange: '$3,199', productUrl: 'https://www.canyon.com/en-us/mountain-bikes/trail/spectral/', availableSizes: ['XS', 'S', 'M', 'L', 'XL'], keySpecs: { travel: '125mm rear / 140mm front', wheel: '29"', frame: 'Carbon' } },
    // Canyon — Enduro (7)
    { brandSlug: 'canyon', categoryNumber: 7, modelName: 'Strive CFR 9', priceRange: '$5,999', productUrl: 'https://www.canyon.com/en-us/mountain-bikes/enduro/strive/', availableSizes: ['XS', 'S', 'M', 'L', 'XL'], keySpecs: { travel: '160mm rear / 170mm front', wheel: '29"', frame: 'Carbon' } },
  ]

  for (const model of models) {
    const brandId = brandIds[model.brandSlug]
    if (!brandId) continue

    await prisma.bikeBrandModel.upsert({
      where: { brandId_categoryNumber_modelName: { brandId, categoryNumber: model.categoryNumber, modelName: model.modelName } },
      update: {
        priceRange: model.priceRange,
        productUrl: model.productUrl,
        availableSizes: model.availableSizes,
        keySpecs: model.keySpecs,
      },
      create: {
        brandId,
        categoryNumber: model.categoryNumber,
        modelName: model.modelName,
        priceRange: model.priceRange,
        productUrl: model.productUrl,
        availableSizes: model.availableSizes,
        keySpecs: model.keySpecs,
      },
    })
  }

  console.log('Done seeding bike data.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Check whether `package.json` has a prisma seed script**

Open `package.json` and look for a `"prisma"` section. If it exists and points to a different seed file (e.g., `prisma/seed.ts`), run the bikes seed separately:

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsx prisma/seed-bikes.ts
```

If there is no seed script, or you want to add one, update `package.json` to add:

```json
"prisma": {
  "seed": "tsx prisma/seed-bikes.ts"
}
```

Then run:

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma db seed
```

### 5b — Mega-nav update

- [ ] **Modify `src/ui/components/MegaNav/megaNavConfig.ts`**

Add `History` to the lucide-react imports at the top of the file:

```typescript
import {
  GraduationCap, BookOpen, ClipboardList, Trophy, LayoutDashboard,
  MessageSquare, LayoutList, Users, Search, Bookmark, PenLine, CalendarDays,
  Map, Compass, MapPin,
  Bike, Sliders, Wrench, Star, History,
  ShoppingBag, Tag, PlusCircle, Heart,
} from 'lucide-react'
```

Then in the `bikes` entry, find the `groups` array and add a new group after the existing "Research" group:

```typescript
      {
        label: 'Your Bikes',
        links: [
          { icon: History, label: 'My Results', href: '/bikes/selector/history' },
        ],
      },
```

The full `bikes` entry should look like:

```typescript
  bikes: {
    featured: {
      icon: Bike,
      title: 'Find Your Perfect Bike',
      description: 'Answer a few questions and get matched to your ideal mountain bike.',
      href: '/bikes/selector',
      ctaLabel: 'Take the Quiz',
      bgClass: 'bg-purple-500/10',
    },
    groups: [
      {
        label: 'Tools',
        links: [
          { icon: Sliders, label: 'Bike Selector', href: '/bikes/selector' },
          { icon: Wrench, label: 'My Garage', href: '/bikes/garage' },
        ],
      },
      {
        label: 'Research',
        links: [
          { icon: Star, label: 'Reviews', href: '/reviews' },
        ],
      },
      {
        label: 'Your Bikes',
        links: [
          { icon: History, label: 'My Results', href: '/bikes/selector/history' },
        ],
      },
    ],
  },
```

### 5c — Final TypeScript check and deploy

- [ ] **TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx tsc --noEmit
```

- [ ] **Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add prisma/seed-bikes.ts src/ui/components/MegaNav/megaNavConfig.ts package.json
git commit -m "feat(bikes): add seed data for spectrum categories and brands, update mega-nav with My Results link"
```

- [ ] **Deploy**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git push origin main
```

Vercel auto-deploys on push to main. After deploy:
1. Run seed against production DB: `DATABASE_URL=<prod_url> npx tsx prisma/seed-bikes.ts`
2. Verify `/bikes/selector` → takes quiz → redirects to `/bikes/selector/results/[id]`
3. Verify `/bikes/selector/history` requires auth and shows past results
4. Verify consultation modal submits and appears in `bike_consultation_requests` table
5. Verify XP granted for `bike_quiz_completed` (check `xp_grants` table or user XP aggregate)

---

## Summary of Deliverables

| Task | Key files | Status |
|------|-----------|--------|
| 1 — DB Schema | `prisma/schema.prisma` + migration | - [ ] |
| 2 — APIs | `api/bikes/quiz/submit`, `api/bikes/quiz/results`, `api/bikes/consultation` | - [ ] |
| 2 — Store update | `useQuizStore.ts` adds `sessionToken` | - [ ] |
| 2 — Flow update | `BikeQuizFlow.tsx` calls API + navigates | - [ ] |
| 3 — Pages | `results/[id]/page.tsx`, `results/page.tsx`, `history/page.tsx` | - [ ] |
| 3 — Components | `QuizResults.tsx`, `ResultsHistory.tsx` | - [ ] |
| 4 — Components | `ConsultationModal.tsx`, `BrandLinks.tsx` | - [ ] |
| 5 — Seed | `prisma/seed-bikes.ts` — 5 categories, 6 brands, ~16 models | - [ ] |
| 5 — Mega-nav | `megaNavConfig.ts` — "My Results" link in "Your Bikes" group | - [ ] |
