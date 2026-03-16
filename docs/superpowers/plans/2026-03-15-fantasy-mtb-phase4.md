# Fantasy MTB Racing — Phase 4: Paid Tiers + Prizes

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monetize Fantasy MTB with season passes ($29.99/series/season) and mulligan packs ($5/$10) via Stripe Checkout. Season pass holders get drop-round protection, gated expert picks, and automatic entry into the Championship League. Mulligans auto-pick from the previous event's team when a roster deadline is missed.

**Architecture:** A dedicated fantasy Stripe webhook at `/api/fantasy/stripe/webhook` handles `checkout.session.completed` (season pass + mulligan) and `charge.refunded` (revoke pass). Drop round logic runs inside the existing `resultsScore` worker — after scoring, it marks the worst `FantasyEventScore` per season pass holder as `isDropRound=true` (then the season score UPSERT already uses `FILTER (WHERE NOT isDropRound)`). A new `fantasy.mulligan.auto-pick` pg-boss job fires from the lock-rosters cron for any team with zero picks. Expert picks are blurred+upsell for non-pass holders before deadline, then visible to all after deadline.

**Tech Stack:** Next.js 15.5.12, Stripe (`2026-02-25.clover` API version), Prisma v7 + raw SQL (pg.Pool), pg-boss v10, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-15-fantasy-mtb-design.md` — sections: Season Pass, Mulligan, Drop Round, Championship League

**Prerequisite:** Phase 3 plan complete (`docs/superpowers/plans/2026-03-15-fantasy-mtb-phase3.md`)

---

## File Structure

**Create:**
- `src/modules/fantasy/lib/stripe.ts` — fantasy-specific Stripe helpers (`createSeasonPassCheckout`, `createMulliganCheckout`, `constructFantasyStripeEvent`)
- `src/modules/fantasy/actions/purchaseSeasonPass.ts` — server action: create Stripe Checkout session for season pass
- `src/modules/fantasy/actions/purchaseMulligan.ts` — server action: create Stripe Checkout session for mulligan pack
- `src/app/api/fantasy/stripe/webhook/route.ts` — fantasy Stripe webhook (`checkout.session.completed` + `charge.refunded`)
- `src/modules/fantasy/worker/mulliganAutoPick.ts` — pg-boss handler: auto-pick prev event's team for teams with no picks
- `src/modules/fantasy/queries/getSeasonPass.ts` — query: check if user has active season pass for a series/season
- `src/modules/fantasy/queries/getChampionshipLeaderboard.ts` — query: leaderboard for championship league members only
- `src/ui/components/fantasy/ExpertPicksPanel.tsx` — expert picks display (blurred upsell for free users, full for pass holders)
- `src/ui/components/fantasy/SeasonPassCTA.tsx` — CTA card for series hub page

**Modify:**
- `prisma/schema.prisma` — add `stripePaymentIntentId String?` to `SeasonPassPurchase`
- `src/lib/env.ts` — add `FANTASY_STRIPE_WEBHOOK_SECRET`, `STRIPE_SEASON_PASS_PRICE_ID`, `STRIPE_MULLIGAN_1_PRICE_ID`, `STRIPE_MULLIGAN_3_PRICE_ID` optional env vars
- `src/lib/pgboss.ts` — add `'fantasy.mulligan.auto-pick'` to `JobName` union
- `src/modules/fantasy/worker/resultsScore.ts` — after scoring, run drop-round SQL for season pass holders
- `src/app/api/cron/fantasy/lock-rosters/route.ts` — after lock, find teams with zero picks and enqueue `fantasy.mulligan.auto-pick` jobs for teams whose user has mulligan balance > 0
- `src/app/fantasy/[series]/leaderboard/page.tsx` — add Championship tab alongside Global tab
- `src/app/fantasy/[series]/page.tsx` — add SeasonPassCTA + ExpertPicksPanel for the next open event

---

## Chunk 1: Stripe Integration

### Task 1: Schema + env vars

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/env.ts`

- [ ] **Step 1: Add `stripePaymentIntentId` to `SeasonPassPurchase`**

In `prisma/schema.prisma`, find `model SeasonPassPurchase` and add `stripePaymentIntentId String?` after `stripeSessionId String @unique`. The full updated model:

```prisma
model SeasonPassPurchase {
  id                    String        @id @default(cuid())
  userId                String
  seriesId              String
  season                Int
  stripeSessionId       String        @unique
  stripePaymentIntentId String?
  status                PassStatus    @default(active)
  createdAt             DateTime      @default(now())
  user                  User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  series                FantasySeries @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  @@unique([userId, seriesId, season])
  @@map("season_pass_purchases")
}
```

- [ ] **Step 2: Push schema**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx prisma db push
```

Expected: `season_pass_purchases` gains `stripePaymentIntentId` column. Prisma client regenerated.

- [ ] **Step 3: Add env vars to `src/lib/env.ts`**

In the `// Optional per-module` section, add four new vars. The updated optional block (preserve existing entries):

```typescript
  // Optional per-module
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_CALCOM_LINK: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  FANTASY_STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SEASON_PASS_PRICE_ID: z.string().optional(),
  STRIPE_MULLIGAN_1_PRICE_ID: z.string().optional(),
  STRIPE_MULLIGAN_3_PRICE_ID: z.string().optional(),
  BUNNY_CDN_HOSTNAME: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_BUNNY_CDN_HOSTNAME: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  FANTASY_BOT_USER_ID: z.string().optional(),
```

- [ ] **Step 4: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add prisma/schema.prisma src/lib/env.ts
git commit -m "feat(fantasy): schema stripePaymentIntentId on SeasonPassPurchase + env vars for fantasy Stripe"
```

---

### Task 2: Fantasy Stripe lib + purchase server actions

**Files:**
- Create: `src/modules/fantasy/lib/stripe.ts`
- Create: `src/modules/fantasy/actions/purchaseSeasonPass.ts`
- Create: `src/modules/fantasy/actions/purchaseMulligan.ts`

- [ ] **Step 1: Create `src/modules/fantasy/lib/stripe.ts`**

This module is separate from `src/modules/creators/lib/stripe.ts`. It reuses the same `getStripe()` pattern but uses its own webhook secret:

```typescript
// src/modules/fantasy/lib/stripe.ts
import 'server-only'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

export type MulliganPack = '1' | '3'

/** Create a Stripe Checkout session for a season pass purchase */
export async function createSeasonPassCheckout(params: {
  userId: string
  seriesId: string
  season: number
  seriesName: string
  returnUrl: string
}): Promise<string> {
  const stripe = getStripe()
  const priceId = process.env.STRIPE_SEASON_PASS_PRICE_ID
  if (!priceId) throw new Error('STRIPE_SEASON_PASS_PRICE_ID is not configured')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type: 'fantasy_season_pass',
      userId: params.userId,
      seriesId: params.seriesId,
      season: String(params.season),
    },
    success_url: `${params.returnUrl}?pass=success`,
    cancel_url: `${params.returnUrl}?pass=cancelled`,
  })

  return session.url!
}

/** Create a Stripe Checkout session for a mulligan pack purchase */
export async function createMulliganCheckout(params: {
  userId: string
  pack: MulliganPack
  returnUrl: string
}): Promise<string> {
  const stripe = getStripe()

  const priceId =
    params.pack === '1'
      ? process.env.STRIPE_MULLIGAN_1_PRICE_ID
      : process.env.STRIPE_MULLIGAN_3_PRICE_ID

  if (!priceId) {
    throw new Error(`STRIPE_MULLIGAN_${params.pack}_PRICE_ID is not configured`)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type: 'fantasy_mulligan',
      userId: params.userId,
      pack: params.pack,
    },
    success_url: `${params.returnUrl}?mulligan=success`,
    cancel_url: `${params.returnUrl}?mulligan=cancelled`,
  })

  return session.url!
}

/** Verify and parse an incoming webhook event using the fantasy-specific secret */
export async function constructFantasyStripeEvent(body: string, signature: string) {
  const stripe = getStripe()
  const secret = process.env.FANTASY_STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('FANTASY_STRIPE_WEBHOOK_SECRET is not configured')
  return stripe.webhooks.constructEvent(body, signature, secret)
}
```

- [ ] **Step 2: Create `src/modules/fantasy/actions/purchaseSeasonPass.ts`**

```typescript
// src/modules/fantasy/actions/purchaseSeasonPass.ts
'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { createSeasonPassCheckout } from '../lib/stripe'
import { redirect } from 'next/navigation'

export async function purchaseSeasonPass(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/sign-in')
  }
  const userId = session.user.id

  const seriesId = formData.get('seriesId') as string
  const season = Number(formData.get('season'))
  const returnUrl = formData.get('returnUrl') as string

  if (!seriesId || !season || !returnUrl) {
    throw new Error('Missing required fields')
  }

  // Check if user already has an active pass for this series+season
  const existing = await db.seasonPassPurchase.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    select: { status: true },
  })
  if (existing?.status === 'active') {
    redirect(returnUrl + '?pass=already_active')
  }

  // Load series name for Checkout description
  const series = await db.fantasySeries.findUnique({
    where: { id: seriesId },
    select: { name: true },
  })
  if (!series) throw new Error('Series not found')

  const checkoutUrl = await createSeasonPassCheckout({
    userId,
    seriesId,
    season,
    seriesName: series.name,
    returnUrl,
  })

  redirect(checkoutUrl)
}
```

- [ ] **Step 3: Create `src/modules/fantasy/actions/purchaseMulligan.ts`**

```typescript
// src/modules/fantasy/actions/purchaseMulligan.ts
'use server'

import { auth } from '@/lib/auth'
import { createMulliganCheckout } from '../lib/stripe'
import type { MulliganPack } from '../lib/stripe'
import { redirect } from 'next/navigation'

export async function purchaseMulligan(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/sign-in')
  }
  const userId = session.user.id

  const pack = formData.get('pack') as MulliganPack
  const returnUrl = formData.get('returnUrl') as string

  if (!pack || !returnUrl || !['1', '3'].includes(pack)) {
    throw new Error('Invalid pack selection')
  }

  const checkoutUrl = await createMulliganCheckout({
    userId,
    pack,
    returnUrl,
  })

  redirect(checkoutUrl)
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/modules/fantasy/lib/stripe.ts \
        src/modules/fantasy/actions/purchaseSeasonPass.ts \
        src/modules/fantasy/actions/purchaseMulligan.ts
git commit -m "feat(fantasy): Stripe lib + purchaseSeasonPass + purchaseMulligan server actions"
```

---

### Task 3: Fantasy Stripe webhook

**Files:**
- Create: `src/app/api/fantasy/stripe/webhook/route.ts`

This webhook is completely separate from the creators webhook at `src/app/api/stripe/webhook/route.ts`. It handles three events:

1. `checkout.session.completed` with `metadata.type === 'fantasy_season_pass'` → upsert `SeasonPassPurchase` (active) + ensure Championship League exists + auto-join user
2. `checkout.session.completed` with `metadata.type === 'fantasy_mulligan'` → upsert `MulliganBalance` incrementing `totalPurchased` by pack quantity
3. `charge.refunded` → find `SeasonPassPurchase` by `stripePaymentIntentId`, check if any `FantasyEventScore` exists for the user's team in this season — if none scored yet, set `status = 'refunded'`

- [ ] **Step 1: Implement route**

```typescript
// src/app/api/fantasy/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db/client'
import { constructFantasyStripeEvent } from '@/modules/fantasy/lib/stripe'
import type Stripe from 'stripe'
import { nanoid } from 'nanoid'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Awaited<ReturnType<typeof constructFantasyStripeEvent>>
  try {
    event = await constructFantasyStripeEvent(body, signature)
  } catch (err) {
    console.error('[fantasy/stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    switch (event.type as string) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata ?? {}

        // ── Season Pass ──────────────────────────────────────────────────
        if (meta.type === 'fantasy_season_pass') {
          const { userId, seriesId, season: seasonStr } = meta
          const season = Number(seasonStr)
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : null

          if (!userId || !seriesId || !season) {
            console.error('[fantasy/stripe/webhook] Missing season pass metadata', meta)
            break
          }

          await client.query('BEGIN')

          // 1. Upsert SeasonPassPurchase (idempotent — stripeSessionId is unique)
          await client.query(
            `INSERT INTO season_pass_purchases
               (id, "userId", "seriesId", season, "stripeSessionId", "stripePaymentIntentId", status, "createdAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'active', NOW())
             ON CONFLICT ("stripeSessionId") DO UPDATE SET
               "stripePaymentIntentId" = EXCLUDED."stripePaymentIntentId",
               status = 'active'`,
            [userId, seriesId, season, session.id, paymentIntentId]
          )

          // 2. Ensure Championship League exists for this series+season
          //    Lazily created on first purchase — one league per series+season
          const leagueRes = await client.query(
            `SELECT id FROM fantasy_leagues
             WHERE "seriesId" = $1 AND season = $2 AND "isChampionship" = TRUE
             LIMIT 1`,
            [seriesId, season]
          )

          let leagueId: string
          if (leagueRes.rows.length === 0) {
            // Get series name for the league name
            const seriesRes = await client.query(
              `SELECT name FROM fantasy_series WHERE id = $1`,
              [seriesId]
            )
            const seriesName: string = seriesRes.rows[0]?.name ?? 'Championship'
            const inviteCode = nanoid(6)
            const newLeagueRes = await client.query(
              `INSERT INTO fantasy_leagues
                 (id, name, "seriesId", season, "createdByUserId", "inviteCode",
                  "isPublic", "isChampionship", "createdAt")
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, FALSE, TRUE, NOW())
               RETURNING id`,
              [
                `${seriesName} ${season} Championship`,
                seriesId,
                season,
                userId,       // created by the first purchaser
                inviteCode,
              ]
            )
            leagueId = newLeagueRes.rows[0].id
            console.log(
              `[fantasy/stripe/webhook] Created Championship League ${leagueId} for series ${seriesId} season ${season}`
            )
          } else {
            leagueId = leagueRes.rows[0].id
          }

          // 3. Auto-join user to Championship League (idempotent)
          await client.query(
            `INSERT INTO fantasy_league_members (id, "leagueId", "userId", "joinedAt")
             VALUES (gen_random_uuid(), $1, $2, NOW())
             ON CONFLICT ("leagueId", "userId") DO NOTHING`,
            [leagueId, userId]
          )

          await client.query('COMMIT')

          console.log(
            `[fantasy/stripe/webhook] Season pass activated: user=${userId} series=${seriesId} season=${season}`
          )
        }

        // ── Mulligan Pack ────────────────────────────────────────────────
        if (meta.type === 'fantasy_mulligan') {
          const { userId, pack } = meta
          const quantity = pack === '3' ? 3 : 1

          if (!userId || !pack) {
            console.error('[fantasy/stripe/webhook] Missing mulligan metadata', meta)
            break
          }

          // Upsert MulliganBalance — increment totalPurchased by pack quantity
          await client.query(
            `INSERT INTO mulligan_balances (id, "userId", "totalPurchased", "totalUsed")
             VALUES (gen_random_uuid(), $1, $2, 0)
             ON CONFLICT ("userId") DO UPDATE SET
               "totalPurchased" = mulligan_balances."totalPurchased" + $2`,
            [userId, quantity]
          )

          console.log(
            `[fantasy/stripe/webhook] Mulligan pack granted: user=${userId} pack=${pack} (+${quantity})`
          )
        }

        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId =
          typeof charge.payment_intent === 'string' ? charge.payment_intent : null

        if (!paymentIntentId) break

        // Find season pass by payment intent
        const passRes = await client.query(
          `SELECT id, "userId", "seriesId", season FROM season_pass_purchases
           WHERE "stripePaymentIntentId" = $1 AND status = 'active'
           LIMIT 1`,
          [paymentIntentId]
        )

        if (passRes.rows.length === 0) break

        const pass = passRes.rows[0] as {
          id: string
          userId: string
          seriesId: string
          season: number
        }

        // Check if any event has been scored for this user's team in this season
        // Only revoke if the user hasn't benefited yet (no scored events)
        const scoredRes = await client.query(
          `SELECT fes.id
           FROM fantasy_event_scores fes
           JOIN fantasy_teams ft ON ft.id = fes."teamId"
           WHERE ft."userId" = $1
             AND ft."seriesId" = $2
             AND ft.season = $3
           LIMIT 1`,
          [pass.userId, pass.seriesId, pass.season]
        )

        if (scoredRes.rows.length > 0) {
          // User has already scored — do not revoke, log and exit
          console.warn(
            `[fantasy/stripe/webhook] Refund requested but user ${pass.userId} already has scored events — not revoking pass ${pass.id}`
          )
          break
        }

        // Safe to revoke — no scored events yet
        await client.query('BEGIN')

        await client.query(
          `UPDATE season_pass_purchases SET status = 'refunded' WHERE id = $1`,
          [pass.id]
        )

        // Remove from Championship League
        await client.query(
          `DELETE FROM fantasy_league_members flm
           USING fantasy_leagues fl
           WHERE flm."leagueId" = fl.id
             AND fl."seriesId" = $1
             AND fl.season = $2
             AND fl."isChampionship" = TRUE
             AND flm."userId" = $3`,
          [pass.seriesId, pass.season, pass.userId]
        )

        await client.query('COMMIT')

        console.log(
          `[fantasy/stripe/webhook] Pass revoked: user=${pass.userId} series=${pass.seriesId} season=${pass.season}`
        )
        break
      }

      default:
        break
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('[fantasy/stripe/webhook] Handler error:', err)
    // Return 200 to prevent Stripe from retrying — log the error instead
    return NextResponse.json({ received: true, error: 'Handler error' })
  } finally {
    client.release()
  }

  return NextResponse.json({ received: true })
}
```

Note: `nanoid` is already installed in the project (used elsewhere). If not, add it: `npm install nanoid`.

- [ ] **Step 2: Verify nanoid is available**

```bash
cd /Users/kylewarner/Documents/ride-mtb && node -e "require('nanoid')" 2>&1 || npm install nanoid
```

Expected: Either no output (already installed) or successful install.

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | grep -i "fantasy/stripe" | head -20
```

Expected: No errors for the new file.

- [ ] **Step 4: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/app/api/fantasy/stripe/
git commit -m "feat(fantasy): fantasy Stripe webhook — season pass, mulligan, refund revocation"
```

---

## Chunk 2: Drop Round + Mulligan Worker

### Task 4: Drop round in scoring worker

**Files:**
- Modify: `src/modules/fantasy/worker/resultsScore.ts`

The drop round logic runs at the end of `handleResultsScore`, after all `FantasyEventScore` rows are upserted and ranked. For each season pass holder in this series+season, it:

1. Finds all their `FantasyEventScore` rows for this season
2. Resets all `isDropRound = false` (re-evaluates every run — idempotent)
3. Sets `isDropRound = true` on the single lowest-scoring event (ties broken by eventId for determinism)
4. Only marks a drop round if the user has participated in 2+ events (no benefit from dropping their only event)

The existing season score UPSERT in step 6 already has `FILTER (WHERE NOT fes."isDropRound")`, so no further changes needed there.

- [ ] **Step 1: Add drop round logic at end of `handleResultsScore`**

In `src/modules/fantasy/worker/resultsScore.ts`, after step 7 (Assign season ranks) and before step 8 (Grant XP), add the following block. Insert it so it appears between the season rank assignment and the XP grant loop:

```typescript
    // 7b. Update drop rounds for season pass holders
    // For each user with an active season pass, mark their worst event as the drop round.
    // This runs after every scoring so the drop round always reflects the current season.
    const passHolderRes = await client.query(
      `SELECT spp."userId"
       FROM season_pass_purchases spp
       JOIN fantasy_teams ft ON ft."userId" = spp."userId"
         AND ft."seriesId" = spp."seriesId"
         AND ft.season = spp.season
       WHERE spp."seriesId" = $1
         AND spp.season = $2
         AND spp.status = 'active'
       GROUP BY spp."userId"`,
      [seriesId, season]
    )

    for (const passHolder of passHolderRes.rows) {
      // Get all event scores for this user's team in this season
      const teamScoresRes = await client.query(
        `SELECT fes.id, fes."totalPoints", fes."eventId"
         FROM fantasy_event_scores fes
         JOIN fantasy_teams ft ON ft.id = fes."teamId"
         WHERE ft."userId" = $1
           AND ft."seriesId" = $2
           AND ft.season = $3
         ORDER BY fes."totalPoints" ASC, fes."eventId" ASC`,
        [passHolder.userId, seriesId, season]
      )

      const scores = teamScoresRes.rows as Array<{
        id: string
        totalPoints: number
        eventId: string
      }>

      // Need at least 2 scored events before a drop round is meaningful
      if (scores.length < 2) {
        // Reset any previously-set drop round flag
        for (const s of scores) {
          await client.query(
            `UPDATE fantasy_event_scores SET "isDropRound" = FALSE WHERE id = $1`,
            [s.id]
          )
        }
        continue
      }

      // The first row is the worst score (ORDER BY totalPoints ASC)
      const worstId = scores[0].id

      // Batch reset all to false, then set the worst to true
      const allIds = scores.map(s => s.id)
      await client.query(
        `UPDATE fantasy_event_scores
         SET "isDropRound" = (id = $1)
         WHERE id = ANY($2::text[])`,
        [worstId, allIds]
      )
    }
```

After inserting this block, step 8 (Grant XP) follows immediately after. The complete final section of the function should look like this (showing the splice point):

```
    // 7. Assign season ranks
    ...existing code...

    // 7b. Update drop rounds for season pass holders
    ...new code above...

    // 8. Grant XP to all participants
    ...existing code...
```

- [ ] **Step 2: Verify**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | grep "resultsScore" | head -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/modules/fantasy/worker/resultsScore.ts
git commit -m "feat(fantasy): drop round — mark worst event isDropRound for season pass holders after each scoring"
```

---

### Task 5: Mulligan auto-pick worker + pg-boss job

**Files:**
- Create: `src/modules/fantasy/worker/mulliganAutoPick.ts`
- Modify: `src/lib/pgboss.ts`

The `fantasy.mulligan.auto-pick` job fires when a roster deadline passes and a team has zero picks but their user has a positive mulligan balance (`totalPurchased - totalUsed > 0`).

The worker:
1. Looks up the previous event (by `raceDate` before the current event's `rosterDeadline`, same series)
2. Loads that event's picks for this team (locked)
3. Replicates those picks into the current event (respecting the current event's market prices)
4. Increments `MulliganBalance.totalUsed`
5. Records a `MulliganUse` row
6. The entire operation runs in a transaction with SELECT FOR UPDATE on the team row to prevent races

- [ ] **Step 1: Add job name to `src/lib/pgboss.ts`**

In `src/lib/pgboss.ts`, update the `JobName` union to include `'fantasy.mulligan.auto-pick'`:

```typescript
export type JobName =
  | 'video.ingest'
  | 'video.transcode'
  | 'video.tag'
  | 'fantasy.prices.recalculate'
  | 'fantasy.prices.reveal'
  | 'fantasy.results.scrape'
  | 'fantasy.results.score'
  | 'fantasy.mulligan.auto-pick'
```

- [ ] **Step 2: Create `src/modules/fantasy/worker/mulliganAutoPick.ts`**

```typescript
// src/modules/fantasy/worker/mulliganAutoPick.ts
// Called by pg-boss worker as 'fantasy.mulligan.auto-pick'
// Input: { teamId: string; eventId: string; userId: string }
//
// Auto-picks the previous event's team for a user who missed the roster deadline
// but has an unspent mulligan. The entire operation is transactional with
// SELECT FOR UPDATE to prevent double-use of a single mulligan charge.

import { pool } from '@/lib/db/client'
import { WILDCARD_PRICE_THRESHOLD } from '../constants/scoring'

export interface MulliganAutoPickPayload {
  teamId: string
  eventId: string
  userId: string
}

export async function handleMulliganAutoPick(payload: MulliganAutoPickPayload) {
  const { teamId, eventId, userId } = payload
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Lock the team row to prevent concurrent mulligan jobs
    const teamRes = await client.query(
      `SELECT ft.id, ft."seriesId", ft.season
       FROM fantasy_teams ft
       WHERE ft.id = $1
       FOR UPDATE`,
      [teamId]
    )
    if (teamRes.rows.length === 0) {
      await client.query('ROLLBACK')
      console.warn(`[fantasy.mulligan.auto-pick] Team ${teamId} not found`)
      return
    }
    const { seriesId, season } = teamRes.rows[0] as {
      seriesId: string
      season: number
    }

    // 2. Verify this event still has zero picks (the job may fire late / duplicate)
    const existingPicksRes = await client.query(
      `SELECT id FROM fantasy_picks WHERE "teamId" = $1 AND "eventId" = $2 LIMIT 1`,
      [teamId, eventId]
    )
    if (existingPicksRes.rows.length > 0) {
      await client.query('ROLLBACK')
      console.log(
        `[fantasy.mulligan.auto-pick] Team ${teamId} already has picks for event ${eventId} — skipping`
      )
      return
    }

    // 3. Lock mulligan balance row + check available balance
    const balanceRes = await client.query(
      `SELECT id, "totalPurchased", "totalUsed"
       FROM mulligan_balances
       WHERE "userId" = $1
       FOR UPDATE`,
      [userId]
    )
    if (balanceRes.rows.length === 0) {
      await client.query('ROLLBACK')
      console.warn(`[fantasy.mulligan.auto-pick] No mulligan balance for user ${userId}`)
      return
    }
    const balance = balanceRes.rows[0] as {
      id: string
      totalPurchased: number
      totalUsed: number
    }
    const available = balance.totalPurchased - balance.totalUsed
    if (available <= 0) {
      await client.query('ROLLBACK')
      console.warn(
        `[fantasy.mulligan.auto-pick] User ${userId} has no mulligan balance (purchased=${balance.totalPurchased} used=${balance.totalUsed})`
      )
      return
    }

    // 4. Check no MulliganUse record already exists for this team+event (idempotent)
    const mulliganUseRes = await client.query(
      `SELECT id FROM mulligan_uses WHERE "teamId" = $1 AND "eventId" = $2 LIMIT 1`,
      [teamId, eventId]
    )
    if (mulliganUseRes.rows.length > 0) {
      await client.query('ROLLBACK')
      console.log(
        `[fantasy.mulligan.auto-pick] MulliganUse already exists for team ${teamId} event ${eventId} — skipping`
      )
      return
    }

    // 5. Find the previous scored event for this series
    //    "Previous" = most recent FantasyEvent with status = 'scored' and raceDate before
    //    this event's rosterDeadline. The spec requires status = 'scored' only — results_pending
    //    events have no locked picks to copy from (scoring hasn't run yet).
    const prevEventRes = await client.query(
      `SELECT fe.id
       FROM fantasy_events fe
       WHERE fe."seriesId" = $1
         AND fe."raceDate" < (
           SELECT "rosterDeadline" FROM fantasy_events WHERE id = $2
         )
         AND fe.status = 'scored'
       ORDER BY fe."raceDate" DESC
       LIMIT 1`,
      [seriesId, eventId]
    )
    if (prevEventRes.rows.length === 0) {
      await client.query('ROLLBACK')
      console.warn(
        `[fantasy.mulligan.auto-pick] No previous scored event found for series ${seriesId} before event ${eventId}`
      )
      return
    }
    const prevEventId: string = prevEventRes.rows[0].id

    // 6. Load previous event's locked picks for this team, including priceAtPick.
    //    The spec says auto-pick uses previous priceAtPick values (not current market prices)
    //    to avoid penalizing users for market movements during their absence.
    const prevPicksRes = await client.query(
      `SELECT fp."riderId", fp."isWildcard", fp."priceAtPick"
       FROM fantasy_picks fp
       WHERE fp."teamId" = $1
         AND fp."eventId" = $2
         AND fp."lockedAt" IS NOT NULL`,
      [teamId, prevEventId]
    )
    if (prevPicksRes.rows.length === 0) {
      await client.query('ROLLBACK')
      console.warn(
        `[fantasy.mulligan.auto-pick] No locked picks found in previous event ${prevEventId} for team ${teamId}`
      )
      return
    }
    const prevPicks = prevPicksRes.rows as Array<{
      riderId: string
      isWildcard: boolean
      priceAtPick: number
    }>

    // 7. Check which previous riders are still entered in the current event.
    //    We need the current entry to verify the rider is entered; we use prev.priceAtPick
    //    for budget and priceAtPick (spec: re-price using previous priceAtPick values).
    const riderIds = prevPicks.map(p => p.riderId)
    const currentEntriesRes = await client.query(
      `SELECT "riderId"
       FROM rider_event_entries
       WHERE "eventId" = $1 AND "riderId" = ANY($2::text[])`,
      [eventId, riderIds]
    )
    const enteredRiderIds = new Set<string>(currentEntriesRes.rows.map((r: { riderId: string }) => r.riderId))

    // 8. Load salary cap for this series
    const seriesRes = await client.query(
      `SELECT "salaryCap" FROM fantasy_series WHERE id = $1`,
      [seriesId]
    )
    const salaryCap: number = seriesRes.rows[0]?.salaryCap ?? 150_000_000

    // 9. Build picks using PREVIOUS priceAtPick values (not current market prices).
    //    This is the spec requirement: avoid penalizing users for market movements during absence.
    //    isWildcard is re-derived from the previous priceAtPick for slot enforcement.
    //    Spec step 4: riders not in the new event or over budget at prev price are skipped
    //    (full swap-with-cheapest logic is Phase 4 enhancement deferred per complexity;
    //    here we skip ineligible riders and take the valid subset).
    //    Enforce: max 6 picks, max 2 wildcards, salary cap.
    const picksToInsert: Array<{
      riderId: string
      isWildcard: boolean
      priceAtPick: number
    }> = []
    let totalCost = 0
    let wildcardCount = 0

    for (const prev of prevPicks) {
      if (!enteredRiderIds.has(prev.riderId)) {
        console.log(
          `[fantasy.mulligan.auto-pick] Rider ${prev.riderId} not entered in event ${eventId} — skipping`
        )
        continue
      }
      if (picksToInsert.length >= 6) break

      // Re-derive isWildcard from the previous priceAtPick (not current market price)
      const isWildcard = prev.priceAtPick < WILDCARD_PRICE_THRESHOLD
      if (isWildcard && wildcardCount >= 2) {
        console.log(
          `[fantasy.mulligan.auto-pick] Wildcard slots full — skipping rider ${prev.riderId}`
        )
        continue
      }

      // Budget check using previous priceAtPick (spec requirement)
      if (totalCost + prev.priceAtPick > salaryCap) {
        console.log(
          `[fantasy.mulligan.auto-pick] Budget exceeded at rider ${prev.riderId} (prev price ${prev.priceAtPick}) — skipping`
        )
        continue
      }

      picksToInsert.push({
        riderId: prev.riderId,
        isWildcard,
        priceAtPick: prev.priceAtPick,
      })
      totalCost += prev.priceAtPick
      if (isWildcard) wildcardCount++
    }

    if (picksToInsert.length === 0) {
      await client.query('ROLLBACK')
      console.warn(
        `[fantasy.mulligan.auto-pick] No valid picks to replicate for team ${teamId} event ${eventId}`
      )
      return
    }

    // 10. Insert picks — locked immediately (mulligan picks lock at current time)
    const lockedAt = new Date()
    for (const pick of picksToInsert) {
      await client.query(
        `INSERT INTO fantasy_picks
           (id, "teamId", "eventId", "riderId", "isWildcard", "priceAtPick", "lockedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
         ON CONFLICT ("teamId", "eventId", "riderId") DO NOTHING`,
        [teamId, eventId, pick.riderId, pick.isWildcard, pick.priceAtPick, lockedAt]
      )
    }

    // 11. Increment MulliganBalance.totalUsed
    await client.query(
      `UPDATE mulligan_balances SET "totalUsed" = "totalUsed" + 1 WHERE "userId" = $1`,
      [userId]
    )

    // 12. Record MulliganUse
    await client.query(
      `INSERT INTO mulligan_uses (id, "userId", "teamId", "eventId", "usedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())
       ON CONFLICT ("teamId", "eventId") DO NOTHING`,
      [userId, teamId, eventId]
    )

    await client.query('COMMIT')

    console.log(
      `[fantasy.mulligan.auto-pick] Auto-picked ${picksToInsert.length} riders for team ${teamId} event ${eventId} (mulligan used)`
    )
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[fantasy.mulligan.auto-pick] Error:', err)
    throw err // Re-throw so pg-boss retries
  } finally {
    client.release()
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | grep "mulliganAutoPick\|pgboss" | head -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/lib/pgboss.ts src/modules/fantasy/worker/mulliganAutoPick.ts
git commit -m "feat(fantasy): mulligan auto-pick worker — replicate prev event picks with atomic SELECT FOR UPDATE"
```

---

### Task 6: Lock-rosters cron — enqueue mulligan jobs

**Files:**
- Modify: `src/app/api/cron/fantasy/lock-rosters/route.ts`

After locking rosters for an event, the cron must find all teams in the series that have zero picks for this event AND whose user has an available mulligan balance. For each such team, it enqueues a `fantasy.mulligan.auto-pick` job.

- [ ] **Step 1: Update the lock-rosters route**

Replace the full content of `src/app/api/cron/fantasy/lock-rosters/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pool } = await import('@/lib/db/client')
  const { getBoss } = await import('@/lib/pgboss')

  const now = new Date()

  const eventsToLock = await pool.query(
    `SELECT id, "seriesId", (
       SELECT season FROM fantasy_series WHERE id = fe."seriesId"
     ) AS season
     FROM fantasy_events fe
     WHERE status = 'roster_open' AND "rosterDeadline" <= $1`,
    [now]
  )

  let locked = 0
  let mulliganJobsEnqueued = 0

  for (const event of eventsToLock.rows) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `UPDATE fantasy_picks SET "lockedAt" = $1
         WHERE "eventId" = $2 AND "lockedAt" IS NULL`,
        [now, event.id]
      )

      await client.query(
        `UPDATE fantasy_events SET status = 'locked' WHERE id = $1`,
        [event.id]
      )

      await client.query('COMMIT')

      const boss = await getBoss()

      // Send prices reveal job (Phase 3 — existing)
      await boss.send('fantasy.prices.reveal', { eventId: event.id })

      // Find teams with zero picks for this event whose user has a positive mulligan balance
      // A "zero picks" team may have been registered for the series but never built a team for this event.
      const mulliganTeamsRes = await client.query(
        `SELECT ft.id AS "teamId", ft."userId"
         FROM fantasy_teams ft
         JOIN mulligan_balances mb ON mb."userId" = ft."userId"
         WHERE ft."seriesId" = $1
           AND ft.season = $2
           AND (mb."totalPurchased" - mb."totalUsed") > 0
           AND NOT EXISTS (
             SELECT 1 FROM fantasy_picks fp
             WHERE fp."teamId" = ft.id AND fp."eventId" = $3
           )
           AND NOT EXISTS (
             SELECT 1 FROM mulligan_uses mu
             WHERE mu."teamId" = ft.id AND mu."eventId" = $3
           )`,
        [event.seriesId, event.season, event.id]
      )

      for (const team of mulliganTeamsRes.rows) {
        await boss.send(
          'fantasy.mulligan.auto-pick',
          { teamId: team.teamId, eventId: event.id, userId: team.userId },
          {
            // Delay 10 seconds to allow the prices reveal worker to finish first
            startAfter: new Date(Date.now() + 10_000),
          }
        )
        mulliganJobsEnqueued++
      }

      locked++
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`Failed to lock event ${event.id}:`, err)
    } finally {
      client.release()
    }
  }

  return NextResponse.json({
    locked,
    mulliganJobsEnqueued,
    timestamp: new Date().toISOString(),
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | grep "lock-rosters" | head -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/app/api/cron/fantasy/lock-rosters/route.ts
git commit -m "feat(fantasy): lock-rosters cron enqueues mulligan auto-pick jobs for teams with no picks"
```

---

## Chunk 3: Season Pass UI + Leaderboard

### Task 7: getSeasonPass query + expert picks panel

**Files:**
- Create: `src/modules/fantasy/queries/getSeasonPass.ts`
- Create: `src/ui/components/fantasy/ExpertPicksPanel.tsx`

- [ ] **Step 1: Create `src/modules/fantasy/queries/getSeasonPass.ts`**

```typescript
// src/modules/fantasy/queries/getSeasonPass.ts
import { db } from '@/lib/db/client'

/** Returns true if the user has an active season pass for this series+season */
export async function hasSeasonPass(
  userId: string,
  seriesId: string,
  season: number
): Promise<boolean> {
  const pass = await db.seasonPassPurchase.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    select: { status: true },
  })
  return pass?.status === 'active'
}

/** Full pass record, or null */
export async function getSeasonPass(
  userId: string,
  seriesId: string,
  season: number
) {
  return db.seasonPassPurchase.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    select: { id: true, status: true, createdAt: true },
  })
}
```

- [ ] **Step 2: Create `src/ui/components/fantasy/ExpertPicksPanel.tsx`**

Rules:
- Before roster deadline: show full picks only to season pass holders; show blurred rows + upsell CTA to non-pass holders
- After roster deadline: show full picks to everyone (lock has passed, info no longer competitive)
- If no expert picks published yet: show "Expert picks coming soon" placeholder

```typescript
// src/ui/components/fantasy/ExpertPicksPanel.tsx
import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth'
import { hasSeasonPass } from '@/modules/fantasy/queries/getSeasonPass'

interface Props {
  eventId: string
  seriesId: string
  season: number
  rosterDeadline: Date
}

export async function ExpertPicksPanel({
  eventId,
  seriesId,
  season,
  rosterDeadline,
}: Props) {
  const session = await auth()
  const userId = session?.user?.id ?? null

  const expertPicks = await db.expertPick.findMany({
    where: { eventId, publishedAt: { not: null } },
    orderBy: { slot: 'asc' },
    include: {
      rider: { select: { id: true, name: true, nationality: true } },
    },
  })

  if (expertPicks.length === 0) {
    return (
      <div className="border border-[var(--color-border)] rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-1">Expert Picks</h3>
        <p className="text-xs text-[var(--color-text-muted)]">Expert picks coming soon.</p>
      </div>
    )
  }

  const isAfterDeadline = new Date() >= rosterDeadline
  const userHasPass = userId
    ? await hasSeasonPass(userId, seriesId, season)
    : false

  // After deadline: everyone can see. Before deadline: pass holders only.
  const canViewPicks = isAfterDeadline || userHasPass

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Expert Picks</h3>
        {!isAfterDeadline && userHasPass && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            Season Pass
          </span>
        )}
        {isAfterDeadline && (
          <span className="text-xs text-[var(--color-text-muted)]">Roster locked</span>
        )}
      </div>

      {canViewPicks ? (
        <ol className="space-y-1.5">
          {expertPicks.map((pick) => (
            <li
              key={pick.id}
              className="flex items-center gap-3 text-sm"
            >
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-xs font-bold text-[var(--color-text-muted)]">
                {pick.slot}
              </span>
              <span className="font-medium">{pick.rider.name}</span>
              <span className="text-[var(--color-text-muted)] text-xs">{pick.rider.nationality}</span>
            </li>
          ))}
        </ol>
      ) : (
        // Blurred upsell — show blurred rows with a CTA overlay
        <div className="relative">
          <ol className="space-y-1.5 blur-sm select-none pointer-events-none" aria-hidden>
            {expertPicks.map((pick) => (
              <li key={pick.id} className="flex items-center gap-3 text-sm">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-xs font-bold text-[var(--color-text-muted)]">
                  {pick.slot}
                </span>
                <span className="font-medium">{pick.rider.name}</span>
                <span className="text-[var(--color-text-muted)] text-xs">{pick.rider.nationality}</span>
              </li>
            ))}
          </ol>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--color-bg)]/80 rounded">
            <p className="text-sm font-semibold">Unlock Expert Picks</p>
            <p className="text-xs text-[var(--color-text-muted)] text-center px-4">
              Season pass holders see expert picks before roster lock.
            </p>
            <a
              href={`/fantasy/${seriesId}/pass`}
              className="mt-1 bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Get Season Pass — $29.99
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/modules/fantasy/queries/getSeasonPass.ts \
        src/ui/components/fantasy/ExpertPicksPanel.tsx
git commit -m "feat(fantasy): getSeasonPass query + ExpertPicksPanel with blur/upsell for non-pass holders"
```

---

### Task 8: Championship leaderboard tab

**Files:**
- Create: `src/modules/fantasy/queries/getChampionshipLeaderboard.ts`
- Modify: `src/app/fantasy/[series]/leaderboard/page.tsx`

- [ ] **Step 1: Create `src/modules/fantasy/queries/getChampionshipLeaderboard.ts`**

Returns the same shape as `getGlobalLeaderboard` but filtered to championship league members only:

```typescript
// src/modules/fantasy/queries/getChampionshipLeaderboard.ts
import { pool } from '@/lib/db/client'

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string | null
  username: string | null
  avatarUrl: string | null
  totalPoints: number
  eventsPlayed: number
  bestEventScore: number | null
  worstEventScore: number | null
}

export async function getChampionshipLeaderboard(
  seriesId: string,
  season: number
): Promise<LeaderboardEntry[]> {
  const result = await pool.query(
    `SELECT
       fss.rank,
       u.id AS "userId",
       u.name,
       u.username,
       u."avatarUrl",
       fss."totalPoints",
       fss."eventsPlayed",
       fss."bestEventScore",
       fss."worstEventScore"
     FROM fantasy_season_scores fss
     JOIN fantasy_teams ft ON ft.id = fss."teamId"
     JOIN users u ON u.id = ft."userId"
     -- Only include users who are members of the championship league for this series+season
     WHERE EXISTS (
       SELECT 1
       FROM fantasy_league_members flm
       JOIN fantasy_leagues fl ON fl.id = flm."leagueId"
       WHERE fl."seriesId" = $1
         AND fl.season = $2
         AND fl."isChampionship" = TRUE
         AND flm."userId" = ft."userId"
     )
     AND fss."seriesId" = $1
     AND fss.season = $2
     ORDER BY fss."totalPoints" DESC, fss.rank ASC NULLS LAST`,
    [seriesId, season]
  )

  return result.rows.map(
    (
      row: {
        rank: number | null
        userId: string
        name: string | null
        username: string | null
        avatarUrl: string | null
        totalPoints: number
        eventsPlayed: number
        bestEventScore: number | null
        worstEventScore: number | null
      },
      i: number
    ) => ({
      rank: row.rank ?? i + 1,
      userId: row.userId,
      name: row.name,
      username: row.username,
      avatarUrl: row.avatarUrl,
      totalPoints: row.totalPoints,
      eventsPlayed: row.eventsPlayed,
      bestEventScore: row.bestEventScore,
      worstEventScore: row.worstEventScore,
    })
  )
}
```

- [ ] **Step 2: Rewrite `src/app/fantasy/[series]/leaderboard/page.tsx` with tabs**

```typescript
// src/app/fantasy/[series]/leaderboard/page.tsx
import { auth } from '@/lib/auth'
import { getSeriesHub } from '@/modules/fantasy/queries/getSeriesHub'
import { getGlobalLeaderboard } from '@/modules/fantasy/queries/getLeaderboard'
import { getChampionshipLeaderboard } from '@/modules/fantasy/queries/getChampionshipLeaderboard'
import { LeaderboardTable } from '@/ui/components/fantasy/LeaderboardTable'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ series: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function LeaderboardPage({ params, searchParams }: PageProps) {
  const { series } = await params
  const { tab } = await searchParams
  const activeTab = tab === 'championship' ? 'championship' : 'global'

  const session = await auth()
  const seriesData = await getSeriesHub(series)
  if (!seriesData) notFound()

  const [globalEntries, championshipEntries] = await Promise.all([
    getGlobalLeaderboard(seriesData.id, seriesData.season),
    getChampionshipLeaderboard(seriesData.id, seriesData.season),
  ])

  const entries = activeTab === 'championship' ? championshipEntries : globalEntries

  return (
    <div className="py-8 space-y-6">
      <h1 className="text-2xl font-extrabold">{seriesData.name} — Leaderboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <a
          href={`/fantasy/${series}/leaderboard`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'global'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Global ({globalEntries.length})
        </a>
        <a
          href={`/fantasy/${series}/leaderboard?tab=championship`}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'championship'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          Championship ({championshipEntries.length})
        </a>
      </div>

      {activeTab === 'championship' && championshipEntries.length === 0 && (
        <div className="border border-dashed border-[var(--color-border)] rounded-xl p-8 text-center space-y-2">
          <p className="font-semibold text-sm">Championship League</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Season pass holders are automatically entered. Standings appear after the first scored event.
          </p>
          <a
            href={`/fantasy/${series}/pass`}
            className="inline-block mt-2 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Get Season Pass — $29.99
          </a>
        </div>
      )}

      {entries.length > 0 && (
        <LeaderboardTable
          entries={entries}
          currentUserId={session?.user?.id ?? undefined}
        />
      )}

      {activeTab === 'global' && entries.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          No scores yet. Standings will appear after the first event is scored.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | grep "leaderboard\|championship" | head -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/modules/fantasy/queries/getChampionshipLeaderboard.ts \
        src/app/fantasy/[series]/leaderboard/page.tsx
git commit -m "feat(fantasy): championship leaderboard tab — season pass holders only, global+championship tabs"
```

---

### Task 9: Season pass CTA in series hub

**Files:**
- Create: `src/ui/components/fantasy/SeasonPassCTA.tsx`
- Modify: `src/app/fantasy/[series]/page.tsx`

- [ ] **Step 1: Create `src/ui/components/fantasy/SeasonPassCTA.tsx`**

A server component that checks pass status and renders either a "you're in" badge or a purchase CTA. The form action calls `purchaseSeasonPass`.

```typescript
// src/ui/components/fantasy/SeasonPassCTA.tsx
import { auth } from '@/lib/auth'
import { hasSeasonPass } from '@/modules/fantasy/queries/getSeasonPass'
import { purchaseSeasonPass } from '@/modules/fantasy/actions/purchaseSeasonPass'

interface Props {
  seriesId: string
  season: number
  seriesSlug: string
}

export async function SeasonPassCTA({ seriesId, season, seriesSlug }: Props) {
  const session = await auth()

  if (!session?.user?.id) {
    return (
      <div className="border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Season Pass</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Drop round protection · Expert picks · Championship League
          </p>
        </div>
        <a
          href="/sign-in"
          className="shrink-0 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Sign in to buy — $29.99
        </a>
      </div>
    )
  }

  const alreadyHasPass = await hasSeasonPass(session.user.id, seriesId, season)

  if (alreadyHasPass) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center gap-3">
        <span className="text-green-600 text-xl">✓</span>
        <div>
          <p className="font-semibold text-sm text-green-800">Season Pass Active</p>
          <p className="text-xs text-green-700">
            Drop round · Expert picks · Championship League — all unlocked.
          </p>
        </div>
      </div>
    )
  }

  const returnUrl = `${process.env.AUTH_URL}/fantasy/${seriesSlug}`

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-sm">Season Pass</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Drop round protection · Expert picks · Championship League
        </p>
      </div>
      <form action={purchaseSeasonPass} className="shrink-0">
        <input type="hidden" name="seriesId" value={seriesId} />
        <input type="hidden" name="season" value={season} />
        <input type="hidden" name="returnUrl" value={returnUrl} />
        <button
          type="submit"
          className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Get Season Pass — $29.99
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Update `src/app/fantasy/[series]/page.tsx`** to include `SeasonPassCTA` and `ExpertPicksPanel` for the next open event

Replace the full file content:

```typescript
// src/app/fantasy/[series]/page.tsx
import { getSeriesHub } from '@/modules/fantasy/queries/getSeriesHub'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SeasonPassCTA } from '@/ui/components/fantasy/SeasonPassCTA'
import { ExpertPicksPanel } from '@/ui/components/fantasy/ExpertPicksPanel'

export default async function SeriesHubPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const seriesData = await getSeriesHub(series)
  if (!seriesData) notFound()

  // Find the next open event (if any) to show expert picks for
  const openEvent = seriesData.events.find(e => e.status === 'roster_open') ?? null

  return (
    <div className="py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-[var(--color-text-muted)] uppercase font-semibold">
            {seriesData.discipline.toUpperCase()}
          </p>
          <h1 className="text-2xl font-extrabold">{seriesData.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/fantasy/${series}/leaderboard`}
            className="border border-[var(--color-border)] rounded px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)]"
          >
            Leaderboard
          </Link>
          <Link
            href={`/fantasy/${series}/riders`}
            className="border border-[var(--color-border)] rounded px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)]"
          >
            Riders
          </Link>
        </div>
      </div>

      {/* Season Pass CTA */}
      <SeasonPassCTA
        seriesId={seriesData.id}
        season={seriesData.season}
        seriesSlug={series}
      />

      {/* Expert Picks for the open event */}
      {openEvent && (
        <ExpertPicksPanel
          eventId={openEvent.id}
          seriesId={seriesData.id}
          season={seriesData.season}
          rosterDeadline={new Date(openEvent.rosterDeadline)}
        />
      )}

      <div className="space-y-3">
        <h2 className="font-semibold">Events</h2>
        {seriesData.events.map(event => {
          const isOpen = event.status === 'roster_open'
          return (
            <div
              key={event.id}
              className="border border-[var(--color-border)] rounded-xl p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{event.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {event.location} · {new Date(event.raceDate).toLocaleDateString()}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isOpen
                      ? 'bg-green-100 text-green-700'
                      : event.status === 'scored'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {event.status.replace('_', ' ')}
                </span>
              </div>
              {isOpen && (
                <Link
                  href={`/fantasy/${series}/team`}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Build Team
                </Link>
              )}
              {event.status === 'scored' && (
                <Link
                  href={`/fantasy/${series}/team/${event.id}`}
                  className="border border-[var(--color-border)] px-3 py-1.5 rounded text-sm"
                >
                  View Results
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Note: `getSeriesHub` returns events with a `rosterDeadline` field — confirm the query includes it. If not, check `src/modules/fantasy/queries/getSeriesHub.ts` and add `rosterDeadline: true` to the event select.

- [ ] **Step 3: Verify getSeriesHub includes rosterDeadline**

```bash
cd /Users/kylewarner/Documents/ride-mtb && grep -n "rosterDeadline" src/modules/fantasy/queries/getSeriesHub.ts
```

If `rosterDeadline` is not in the select, open `src/modules/fantasy/queries/getSeriesHub.ts` and add `rosterDeadline: true` to the events select block. This is necessary for `ExpertPicksPanel` to receive the correct deadline.

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | grep "SeasonPassCTA\|ExpertPicksPanel\|series/page" | head -10
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/kylewarner/Documents/ride-mtb
git add src/ui/components/fantasy/SeasonPassCTA.tsx \
        src/app/fantasy/[series]/page.tsx
git commit -m "feat(fantasy): SeasonPassCTA + ExpertPicksPanel in series hub page"
```

---

## Chunk 4: Verification

### Task 10: Build check + vitest

- [ ] **Step 1: Run existing fantasy vitest suite**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx vitest run src/modules/fantasy/
```

Expected: All pass (pricing + scoring tests). No regressions.

- [ ] **Step 2: Full TypeScript check**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors. If errors appear, fix them before proceeding.

- [ ] **Step 3: Next.js build**

```bash
cd /Users/kylewarner/Documents/ride-mtb && npx next build 2>&1 | tail -30
```

Expected: Build succeeds. No type or compile errors.

- [ ] **Step 4: Verify all new files exist**

```bash
ls -1 \
  /Users/kylewarner/Documents/ride-mtb/src/modules/fantasy/lib/stripe.ts \
  /Users/kylewarner/Documents/ride-mtb/src/modules/fantasy/actions/purchaseSeasonPass.ts \
  /Users/kylewarner/Documents/ride-mtb/src/modules/fantasy/actions/purchaseMulligan.ts \
  /Users/kylewarner/Documents/ride-mtb/src/app/api/fantasy/stripe/webhook/route.ts \
  /Users/kylewarner/Documents/ride-mtb/src/modules/fantasy/worker/mulliganAutoPick.ts \
  /Users/kylewarner/Documents/ride-mtb/src/modules/fantasy/queries/getSeasonPass.ts \
  /Users/kylewarner/Documents/ride-mtb/src/modules/fantasy/queries/getChampionshipLeaderboard.ts \
  /Users/kylewarner/Documents/ride-mtb/src/ui/components/fantasy/ExpertPicksPanel.tsx \
  /Users/kylewarner/Documents/ride-mtb/src/ui/components/fantasy/SeasonPassCTA.tsx
```

Expected: All 9 files present, no "No such file" errors.

- [ ] **Step 5: Verify Prisma schema has stripePaymentIntentId**

```bash
cd /Users/kylewarner/Documents/ride-mtb && grep "stripePaymentIntentId" prisma/schema.prisma
```

Expected: `stripePaymentIntentId String?` found in `SeasonPassPurchase`.

- [ ] **Step 6: Verify pgboss JobName includes mulligan**

```bash
cd /Users/kylewarner/Documents/ride-mtb && grep "mulligan" src/lib/pgboss.ts
```

Expected: `'fantasy.mulligan.auto-pick'` present in the union.

- [ ] **Step 7: Verify env.ts has fantasy Stripe vars**

```bash
cd /Users/kylewarner/Documents/ride-mtb && grep "FANTASY_STRIPE\|STRIPE_SEASON_PASS\|STRIPE_MULLIGAN" src/lib/env.ts
```

Expected: All four env vars present.

- [ ] **Step 8: Check git log**

```bash
cd /Users/kylewarner/Documents/ride-mtb && git log --oneline -12
```

Expected: 9 commits (one per task above) visible.

---

**Phase 4 complete. Delivers:** Full paid tier system — season passes and mulligan packs via Stripe Checkout, drop-round protection for pass holders (worst event excluded from season total), expert picks gated behind pass with blur/upsell for free users (visible to all post-deadline), Championship League auto-created and auto-joined on first purchase, mulligan auto-pick worker that replicates previous event picks when roster deadline is missed, and a global+championship leaderboard tab view.

**Data flow:**
```
User clicks "Get Season Pass"
  → purchaseSeasonPass server action → Stripe Checkout
  → /api/fantasy/stripe/webhook checkout.session.completed
    → upsert SeasonPassPurchase (active)
    → lazy-create Championship League (isChampionship=true)
    → auto-join user to Championship League

Lock-rosters cron fires
  → locks picks + sends fantasy.prices.reveal
  → queries teams with zero picks + positive mulligan balance
  → enqueues fantasy.mulligan.auto-pick per team (10s delay)

fantasy.mulligan.auto-pick worker
  → SELECT FOR UPDATE team + mulligan_balance
  → load prev event's locked picks (including priceAtPick)
  → replicate picks using previous priceAtPick values (not current market prices)
  → increment totalUsed + create MulliganUse

fantasy.results.score worker (existing, modified)
  → scores all teams
  → new: for each season pass holder, reset isDropRound on all their events
         then set isDropRound=true on their lowest-scoring event (if 2+ events)
  → season score UPSERT already uses FILTER (WHERE NOT isDropRound) — no change needed

charge.refunded webhook
  → find pass by stripePaymentIntentId
  → check for scored events — only revoke if none yet
  → set status='refunded' + remove from Championship League
```

**Next:** Phase 5 — Prize distribution, prize pool display, admin prize disbursement tools
