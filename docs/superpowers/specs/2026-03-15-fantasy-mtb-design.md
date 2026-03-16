# Fantasy MTB Racing — Design Spec

**Date:** 2026-03-15
**Status:** Approved
**Project:** Ride MTB (`/Users/kylewarner/Documents/ride-mtb`)

---

## Overview

Fantasy MTB Racing is a season-long fantasy sports platform built into Ride MTB that lets fans compete by building virtual rider rosters across professional MTB race series. The platform features a **prediction market pricing engine** — a unique differentiator where rider prices dynamically adjust based on real-time selection volume across all active teams. Popular riders become more expensive; overlooked riders become value plays. Ownership percentages are hidden during the roster window and revealed after lock, rewarding research over crowd-following.

Launch series: UCI DH World Cup, Enduro World Series (EWS), UCI XC World Cup. Crankworx (multi-discipline) is planned for Phase 7.

**Monetization:** Free casual play per event. Paid season passes ($29.99/series/season) unlock prize eligibility, drop round, and expert picks. Mulligan packs sold separately as à la carte upsells available to all users (free and paid).

**Prizes:** Cash prizes funded by season pass revenue + sponsored gear from MTB brand partners (Trek, Fox, Shimano, etc.).

---

## Architecture

### Components

**1. `fantasy` module — `src/modules/fantasy/` (Next.js / Vercel)**
All UI and business logic: team selection, dashboard, leaderboards, rider research, leagues, paid tier checkout. Enqueues pg-boss jobs for price recalculation. Reads rider prices from Upstash Redis via 15-second polling. Writes picks/drops to Postgres and triggers Redis updates atomically.

**2. Fly.io video worker (extended)**
New pg-boss job types added to the existing worker service — no new deployment required:
- `results.scrape` — fetch race results from UCI/EWS/XCO websites
- `results.confirm` — thin Vercel server action that enqueues `results.score` after admin approval (not a Fly.io job; runs on Vercel)
- `results.score` — calculate fantasy points after admin confirms results
- `results.override` — admin edits one result; re-enqueues `results.score` for that event (Vercel server action)
- `prices.recalculate` — recompute all rider prices for an event after a pick/drop
- `prices.reveal` — write final ownership % to database at roster deadline

Note: `results.confirm` and `results.override` are Vercel server actions that enqueue Fly.io worker jobs — they are not themselves Fly.io worker job types.

**3. Upstash Redis (existing)**
Price cache: keys `fantasy:prices:{eventId}:{riderId}` hold current market prices. Updated by the worker on every pick/drop. Read by the 15-second polling endpoint. Fast reads, low write volume (only on picks/drops, not continuous).

**4. Admin panel extension — `/admin/fantasy/`**
Series/event management, rider database, result entry and overrides, expert pick publishing, prize management, championship package configuration.

### Data Flow

```
Admin creates: FantasySeries → FantasyEvents → RiderEventEntries (with seed prices)

Roster window opens (2 weeks before race day)
  → Users browse riders
  → Prices fetched from Redis, client polls every 15 seconds
  → User picks rider
    → Server action validates budget → writes FantasyPick to Postgres
    → Enqueues prices.recalculate job (immediate, high priority)
    → Fly.io worker recalculates all prices for event → writes to Redis
    → Other users see updated price on next poll

Roster deadline reached
  → Batch: set FantasyPick.lockedAt for all picks in that event (FIRST)
  → prices.reveal job runs → final ownership % written to RiderEventEntry (SECOND)
  → lockedAt must precede reveal so the ownership calculation is computed over the final locked roster
  → Ownership data published to event forum thread

Race day
  → Vercel cron fires 1hr after scheduled race end
  → results.scrape job → raw results stored
  → Admin reviews scraped results → clicks Confirm
  → results.score job runs:
      → Base points + bonuses calculated per RiderEventEntry
      → FantasyEventScore records written for every team
      → FantasySeasonScore totals updated
      → Global + league leaderboards refreshed
      → XP granted to all participants
      → Email notifications sent with scores + leaderboard positions

Season end
  → Drop round applied (season pass holders: worst event excluded)
  → Grand prize determined by FantasySeasonScore.rank
  → Admin notifies winners
```

### Infrastructure Requirements

| Requirement | Status |
|------------|--------|
| Vercel Pro plan (cron < 24hr intervals) | Required — already needed for creator pipeline |
| Fly.io worker service | Required — already deployed for creator pipeline |
| Upstash Redis | Required — already in stack for rate limiting |
| Stripe (season passes + mulligans) | Required — already partially integrated |
| SendGrid (email notifications) | Required — already in env |

---

## Series, Events & Rider Management

### Series

Each series represents one professional racing circuit for one season.

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | e.g. "UCI DH World Cup 2026" |
| `discipline` | Enum | `dh \| ews \| xc` |
| `season` | Int | Year |
| `status` | Enum | `upcoming \| active \| completed` |
| `salaryCap` | Int | Default 150,000,000 (cents = $1,500,000) |
| `sensitivityFactor` | Float | Prediction market tuning, default 1.5 |

### Events

Each event is one race round within a series.

| Field | Type | Notes |
|-------|------|-------|
| `seriesId` | FK | Parent series |
| `name` | String | e.g. "EWS Round 3 — Finale Ligure" |
| `location` | String | City/venue |
| `country` | String | ISO country code |
| `raceDate` | DateTime | Scheduled race day |
| `rosterDeadline` | DateTime | When picks lock (set by admin) |
| `status` | Enum | `upcoming \| roster_open \| locked \| results_pending \| scored` |
| `scraperUrl` | String | Primary results page URL |
| `scraperUrlStages` | String? | EWS stage results URL (nullable) |

Roster window opens automatically 2 weeks before `raceDate` via a daily Vercel cron job (`/api/cron/fantasy/open-rosters`) that scans for events where `status = upcoming` and `raceDate ≤ now() + 14 days`, setting them to `roster_open`. Admin can manually open/close early via the admin panel.

Roster lock runs via a separate cron job (`/api/cron/fantasy/lock-rosters`, running every 5 minutes on Vercel Pro) that scans for events where `rosterDeadline ≤ now()` and `status = roster_open`. For each such event it: (1) batch-sets `FantasyPick.lockedAt`, (2) sets event `status = locked`, (3) enqueues `prices.reveal`. The 5-minute interval ensures lock occurs within 5 minutes of the deadline without requiring second-precision cron.

### Rider Database

Riders are global records shared across series.

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Full name |
| `nationality` | String | ISO country code |
| `photoUrl` | String? | Profile photo |
| `uciId` | String? | For scraper result matching (nullable) |
| `gender` | Enum | `male \| female` |
| `disciplines` | Enum[] | `dh \| ews \| xc` — rider can appear in multiple series |

**RiderEventEntry** links a rider to a specific event and holds all per-event data:

| Field | Type | Notes |
|-------|------|-------|
| `riderId` | FK | |
| `eventId` | FK | |
| `basePriceCents` | Int | Admin-set seed price at season start |
| `marketPriceCents` | Int | Live prediction market price |
| `ownershipPct` | Float? | Revealed post-lock only |
| `finishPosition` | Int? | Set after race; null for DNS/DNF or EWS partial completion |
| `qualifyingPosition` | Int? | DH/XC only; used for fastest qualifier bonus |
| `fantasyPoints` | Int? | Base points after scoring |
| `bonusPoints` | Int? | Bonus points after scoring |
| `dnsDnf` | Boolean | Default false |
| `partialCompletion` | Boolean | EWS only: rider completed ≥1 stage but has no overall finish position; 0 base points, no penalty |

### Seed Pricing Convention

Admins set base prices at season start based on prior year results:

| Tier | Price Range | Description |
|------|-------------|-------------|
| Elite | $400K–$550K | Top 5 ranked riders |
| Contender | $250K–$399K | Top 10–20 ranked |
| Mid-field | $100K–$249K | Regular top-30 finishers |
| Wildcard | $25K–$99K | Backmarkers, first-year elites, returning pros |

### Salary Cap & Team Structure

- **Cap:** $1,500,000 per team per event
- **Team size:** 6 riders
  - 4 **open slots** — any eligible rider
  - 2 **wildcard slots** — riders priced under $200,000 only
- Wildcard constraint incentivises finding value in the back of the field

---

## Prediction Market Pricing Engine

### Core Mechanic

Rider prices move based on ownership percentage — the share of active fantasy teams that have picked a given rider for a given event. Higher ownership = higher price. Lower ownership = lower price. Prices are cached in Redis and update within 15 seconds of any pick/drop across all users.

### Price Formula

```
ownership_pct = teams_with_rider / effective_team_count

multiplier = 1 + (ownership_pct × sensitivity_factor)

market_price = base_price_cents × multiplier
```

Where:
- `sensitivity_factor` — stored on `FantasySeries`, default `1.5`, admin-tunable without a deploy
- `effective_team_count` — `MAX(actual_team_count, 100)` to dampen price swings at low user counts

**Example:** A rider with base price $300K picked by 40% of 500 teams:
`multiplier = 1 + (0.40 × 1.5) = 1.6` → market price = $480K

### Price Bounds

| Bound | Value | Purpose |
|-------|-------|---------|
| Floor | 50% of base price | Prevents zero-ownership riders dropping below half seed |
| Ceiling | 300% of base price | Prevents universal-ownership riders becoming unaffordable |

### Dampening at Launch

Until `actual_team_count ≥ 100`, the denominator is fixed at 100. This means the first 99 picks produce gentle, predictable price movement rather than wild swings from thin participation.

### Pick/Drop Flow

1. User picks or drops a rider
2. Server action validates budget, writes/deletes `FantasyPick` in Postgres
3. Server action enqueues `prices.recalculate` job (immediate, high priority in pg-boss)
4. Fly.io worker recalculates `marketPriceCents` for all riders in that event
5. Updated prices written to Redis keys `fantasy:prices:{eventId}:{riderId}`
6. Clients polling `/api/fantasy/prices/{eventId}` every 15 seconds receive updated prices

### Ownership Reveal

At roster deadline, `prices.reveal` job:
1. Calculates final `ownershipPct` for every `RiderEventEntry` in that event
2. Writes to Postgres (permanent record for historical analysis)
3. Rider research page and post-lock team views now show ownership %
4. Automated forum reply posted to the event discussion thread with full ownership breakdown

---

## Team Selection & Roster Management

### Route Structure

```
/fantasy/                         → Landing page: active series cards, user's teams, quick stats
/fantasy/[series]/                → Series hub: event list, current standings snapshot
/fantasy/[series]/team            → Team selection for the current open event
/fantasy/[series]/team/[eventId]  → Team view for a specific event (read-only if locked)
/fantasy/[series]/leaderboard     → Global leaderboard (all users) with Championship League tab (season pass holders only)
/fantasy/[series]/riders          → Rider research page
/fantasy/leagues/                 → All leagues the user belongs to
/fantasy/leagues/[leagueId]/      → Individual league leaderboard (friend, survivor, or championship)
/fantasy/leagues/create           → Create new league
```

Championship League auto-joins on season pass purchase — `FantasyLeagueMember` record created in the `checkout.session.completed` webhook handler. No separate opt-in required.

---

### Team Building UI — `/fantasy/{series}/team`

Three-panel layout:

**Panel 1 — Your Team**
- Current 6 picks displayed with rider name, price paid, slot type (open/wildcard)
- Total team cost + remaining budget
- Roster deadline countdown timer
- "Save Team" button (disabled if over budget or incomplete)

**Panel 2 — Rider List**
- All entered riders for the event
- Default sort: market price descending
- Filters: gender, nationality, price range, wildcard-eligible only (trade team filter deferred — `Rider` has no `team` field in this spec)
- Search by name
- Each row: rider photo, name, flag, base price, current market price, price trend arrow (↑↓ since roster opened), ownership indicator (lock icon until post-deadline)
- Click row to expand rider detail

**Panel 3 — Rider Detail**
- Career results summary
- Season results to date
- Average fantasy points per event (all-time + current season)
- Events entered this season
- "Pick" / "Drop" action button

### Budget Validation

All budget validation is server-side. A maximum of 6 picks per team per event is enforced server-side — the server action rejects the pick if `COUNT(active picks for this team + event) >= 6` before inserting. On every pick, the server action uses `SELECT FOR UPDATE` on the `FantasyTeam` row to prevent race conditions from concurrent picks:

```
BEGIN TRANSACTION
  SELECT ... FROM fantasy_teams WHERE id = teamId FOR UPDATE
  current_picks = SELECT * FROM fantasy_picks WHERE teamId = ? AND eventId = ? AND lockedAt IS NULL
  current_cost = SUM(current_picks.priceAtPick)

  // enforce 6-pick max
  if COUNT(current_picks) >= 6 AND this is a new pick (not a swap) → ROLLBACK, return error

  // enforce wildcard slot cap (max 2 wildcard picks per team per event)
  wildcard_count = COUNT(current_picks WHERE isWildcard = true)
  if new_pick.isWildcard AND wildcard_count >= 2 → ROLLBACK, return error

  // budget check: branch on whether this is a swap or a pure add
  if this is a swap (dropping one rider, picking another):
    new_total = current_cost - dropped_rider_price + new_rider_price
  else: // pure add (no rider being dropped)
    new_total = current_cost + new_rider_price
  if new_total > salary_cap → ROLLBACK, return error
  INSERT/DELETE FantasyPick
COMMIT
```

This prevents two concurrent picks from both passing validation while only one should.

`isWildcard` is **never trusted from the client**. The server action re-derives it: `isWildcard = marketPriceCents < 20000000` (i.e., under $200K at time of pick). The client-submitted value is ignored.

Wildcard slot eligibility is locked to the `priceAtPick` value — subsequent market price increases that push a rider above $200K do **not** invalidate the wildcard slot. The eligibility check at roster lock uses `FantasyPick.priceAtPick`, not the current market price. This prevents penalizing users for market movement they cannot control after locking in a pick.

If market price increases push an existing team over budget between polls, a warning banner appears on next page load. Over-budget teams (where `SUM(priceAtPick) > salaryCap` at roster lock) receive `isOverBudget = true` on their `FantasyEventScore` and score 0 for that event.

### Roster Lock

- At `rosterDeadline`, all `FantasyPick.lockedAt` timestamps are set in a batch update; over-budget status is recorded on `FantasyEventScore.isOverBudget` (event-scoped) during scoring, not on `FantasyTeam`
- Locked picks cannot be changed — UI shows read-only team view
- Email sent 24 hours before lock to all users with incomplete teams — defined as fewer than 6 active `FantasyPick` records for that event (including users with 0 picks who have never visited the page)
- Email sent at lock to confirm final team

### Back-to-Back Events

When events are ≤ 7 days apart:
- Each event has its own independent roster
- Previous event's team is pre-filled as a starting point; riders not entered in the new event (e.g., withdrew from series) are silently omitted from the pre-fill, resulting in an incomplete team shown in the UI
- User must explicitly save to confirm — pre-fill is not auto-submitted
- Banner shown: "This is a new event — your previous team has been pre-filled. Review and save before [deadline]."

### Mulligans

A mulligan is a safety net for missed roster deadlines.

- **Cost:** $5 each, or 3 for $10 (purchased via Stripe, stored as `MulliganBalance`)
- **Trigger:** Roster deadline passes with no locked team for that event
- **Auto-pick logic:**
  1. Identify "previous event" as the most recent `FantasyEvent` in the same series with `status = scored`, ordered by `raceDate DESC`. If no prior scored event exists (user missed the first event of the season), the mulligan is not consumed and the user scores 0 for that event; they are notified that no prior team was available to auto-pick from.
  2. Load previous event's team (each rider's locked `priceAtPick` from that prior event)
  3. Re-price the auto-picked team using those **previous event `priceAtPick` values** (not current market prices) to avoid penalizing users for market movements during their absence
  4. For any rider whose previous `priceAtPick` would put the team over budget, or who is not entered in the new event, swap with the cheapest eligible rider in the same slot type (open/wildcard) not already on the team — "cheapest" measured by current `marketPriceCents`
  5. Within a single database transaction: set `FantasyPick.lockedAt` for all new picks AND `SELECT FOR UPDATE` on `MulliganBalance`, increment `totalUsed`, AND write `MulliganUse` record (with `teamId`) — lock + consumption must be atomic. Available balance = `totalPurchased - totalUsed`.
  6. Enqueue `prices.recalculate` for the event (outside the transaction)
  7. Email user confirming their auto-picked team
- If user has 0 mulligans (`totalPurchased - totalUsed = 0`), no team is entered and they score 0 for that event

---

## Manufacturer Cup

### Overview

The Manufacturer Cup is a season-long meta-game layered on top of the core Fantasy MTB experience. Before Round 1, each user picks one bike manufacturer per series. That brand's top-finishing rider each round contributes points to the user's regular weekly fantasy score (a meaningful bonus) and to a separate Manufacturer Cup standings table where all users are ranked by their chosen brand's cumulative season performance.

The manufacturer pick is free — it lives outside the $1M rider budget system and does not consume a roster slot. Every user who registers for a series automatically engages with the Manufacturer Cup.

The pick is brand-level, not rider-level. Rider transfers between teams during the season are part of the game: the rider wearing the brand's kit on race day counts. If a sponsored rider switches brands mid-season, the new brand they are riding for at race day is what matters.

If a user plays multiple series (e.g. UCI DH World Cup and EWS), they make a separate manufacturer pick for each series independently.

---

### Pick Flow

- **Pre-season only.** The manufacturer pick window opens when the series is created in the admin panel (i.e. when `FantasySeries.status = upcoming` or `active` before Round 1 is locked).
- **Locked after Round 1 deadline.** The pick locks at the `rosterDeadline` of the first `FantasyEvent` in the series. Once locked, the pick cannot be changed for the remainder of the season. If a user has not made a pick by that deadline, they have no manufacturer pick for the season and score 0 from this mechanic.
- **One pick per series per season.** Enforced via `@@unique([userId, seriesId, season])` on `ManufacturerPick`.
- **Displayed prominently** on the series hub, team selection page, and leaderboard.

Pick UI location: `/fantasy/[series]/` (series hub page) — a dedicated "Your Manufacturer Pick" card shown above the event list, with a select dropdown while the pick window is open, and a locked display badge once locked.

---

### Points Scoring

#### Half-Table

The manufacturer uses a 50% scaling of the standard rider points table, rounded to the nearest integer:

| Finish | Full Points | Manufacturer Points (×0.5, rounded) |
|--------|-------------|---------------------------------------|
| 1st    | 30          | 15                                    |
| 2nd    | 28          | 14                                    |
| 3rd    | 26          | 13                                    |
| 4th    | 24          | 12                                    |
| 5th    | 22          | 11                                    |
| 6th    | 20          | 10                                    |
| 7th    | 18          | 9                                     |
| 8th    | 16          | 8                                     |
| 9th    | 14          | 7                                     |
| 10th   | 12          | 6                                     |
| 11th   | 10          | 5                                     |
| 12th   | 9           | 5 (4.5 → 5)                           |
| 13th   | 8           | 4                                     |
| 14th   | 7           | 4 (3.5 → 4)                           |
| 15th   | 6           | 3                                     |
| 16th   | 5           | 3 (2.5 → 3)                           |
| 17th   | 4           | 2                                     |
| 18th   | 3           | 2 (1.5 → 2)                           |
| 19th   | 2           | 1                                     |
| 20th   | 1           | 1 (0.5 → 1)                           |
| 21st+  | 0           | 0                                     |
| DNS/DNF | −2         | 0 (no negative for manufacturer)      |

DNS/DNF does not incur a penalty on the manufacturer side — the user simply scores 0 for the manufacturer contribution that round.

This constant lives in `src/modules/fantasy/constants/scoring.ts` as `MANUFACTURER_POSITION_POINTS`.

#### Which Rider Counts

Each round, only **one rider per manufacturer** contributes points — the top-finishing rider for that brand in that event. Specifically:

1. After results are confirmed, find all `RiderEventEntry` rows for the event where `rider.manufacturerId = [the user's chosen manufacturerId]` AND `dnsDnf = false` AND `partialCompletion = false` (for EWS).
2. Sort by `finishPosition ASC`. The rider with the lowest (best) `finishPosition` is the contributing rider.
3. Apply `MANUFACTURER_POSITION_POINTS[finishPosition]` to get the round manufacturer points.
4. If no rider for that brand is entered or no rider finishes (all DNS/DNF), the user scores 0 for the manufacturer contribution that round — no penalty.

The contributing rider and their finish position are stored on `ManufacturerEventScore` for transparency (shown in UI as "Loic Bruni — 2nd → +14 pts").

---

### Manufacturer Cup Standings

A dedicated leaderboard tab, separate from the global fantasy standings.

- **Ranking criterion:** sum of all `ManufacturerEventScore.points` for the user in a given series and season.
- **All users ranked**, regardless of tier (free and paid users compete equally in this table).
- **Tiebreaker:** users with equal total are ranked by the number of events where their manufacturer scored > 0, then by `userId` lexicographically.
- **Displayed on** `/fantasy/[series]/leaderboard` as a "Manufacturer Cup" tab alongside the Global and Championship tabs.

The leaderboard query aggregates `ManufacturerEventScore` grouped by `userId`, ordered by `SUM(points) DESC`.

---

### Round Score Contribution

Each round, the manufacturer points are **added to the user's regular fantasy score** for that event:

- `FantasyEventScore.manufacturerPoints Int @default(0)` — new column, stores the manufacturer bonus for the round.
- `FantasyEventScore.totalPoints` — continues to represent the full score including manufacturer bonus. The scoring worker adds manufacturer points to `totalPoints` when writing the upsert.
- `FantasySeasonScore.totalPoints` — already computed as `SUM(FantasyEventScore.totalPoints WHERE NOT isDropRound)`, so manufacturer points flow through automatically with no extra aggregation logic.

This means manufacturer points appear in the global leaderboard standings (they lift a user's regular rank) AND are separately tracked in the Manufacturer Cup standings via `ManufacturerEventScore`.

---

### Admin Requirements

#### `BikeManufacturer` Model

Admins create and manage manufacturers via `/admin/fantasy/manufacturers`. Fields:

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | PK |
| `name` | String | e.g. "Trek", "Santa Cruz", "Specialized" |
| `slug` | String | URL-safe identifier, unique |
| `logoUrl` | String? | Optional CDN-hosted logo image |

#### Assigning Manufacturers to Riders

The `Rider` model gains a nullable `manufacturerId` FK. Admin assigns a manufacturer to a rider on the rider edit page (`/admin/fantasy/riders/[id]`). The dropdown is populated from `BikeManufacturer` records.

This is intentionally nullable — some riders may be unsponsored or their manufacturer not tracked. A rider with `manufacturerId = null` contributes 0 points to all manufacturer picks.

Mid-season kit changes are handled by updating `Rider.manufacturerId` in the admin panel before race day. There is no history of manufacturer changes — only the current value at the time the `results.score` job runs matters.

---

### Schema Additions

```prisma
model BikeManufacturer {
  id       String  @id @default(cuid())
  name     String
  slug     String  @unique
  logoUrl  String?
  riders   Rider[]
  picks    ManufacturerPick[]
  scores   ManufacturerEventScore[]

  @@map("bike_manufacturers")
}
```

Add to `Rider`:
```prisma
  manufacturerId String?
  manufacturer   BikeManufacturer? @relation(fields: [manufacturerId], references: [id], onDelete: SetNull)
```

```prisma
model ManufacturerPick {
  id             String           @id @default(cuid())
  userId         String
  seriesId       String
  season         Int
  manufacturerId String
  lockedAt       DateTime?
  createdAt      DateTime         @default(now())
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  series         FantasySeries    @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  manufacturer   BikeManufacturer @relation(fields: [manufacturerId], references: [id], onDelete: Cascade)
  eventScores    ManufacturerEventScore[]

  @@unique([userId, seriesId, season])
  @@map("manufacturer_picks")
}

model ManufacturerEventScore {
  id                  String           @id @default(cuid())
  userId              String
  seriesId            String
  season              Int
  eventId             String
  manufacturerPickId  String
  points              Int
  riderId             String           // which rider scored for this manufacturer this event
  riderFinishPosition Int              // that rider's finish position
  user                User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  series              FantasySeries    @relation(fields: [seriesId], references: [id], onDelete: Cascade)
  event               FantasyEvent     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  manufacturerPick    ManufacturerPick @relation(fields: [manufacturerPickId], references: [id], onDelete: Cascade)
  rider               Rider            @relation(fields: [riderId], references: [id], onDelete: Cascade)

  @@unique([userId, seriesId, season, eventId])
  @@index([seriesId, season, userId])
  @@map("manufacturer_event_scores")
}
```

Add to `FantasyEventScore`:
```prisma
  manufacturerPoints Int @default(0)
```

Add to `FantasySeries`:
```prisma
  manufacturerPicks  ManufacturerPick[]
  manufacturerScores ManufacturerEventScore[]
```

Add to `FantasyEvent`:
```prisma
  manufacturerScores ManufacturerEventScore[]
```

---

### Display

| Location | What to Show |
|----------|-------------|
| `/fantasy/[series]/` (series hub) | "Your Manufacturer Pick" card: brand logo + name, locked/open status, season total manufacturer points earned so far |
| `/fantasy/[series]/team` | Small badge at top of "Your Team" panel: brand logo + name + "Manufacturer: [X] pts this season" |
| `/fantasy/[series]/leaderboard` | "Manufacturer Cup" tab: rank, username/avatar, chosen brand logo + name, season total manufacturer points |
| Post-event score breakdown | Line item: "[Rider Name] — [Position] — [Brand] → +[N] manufacturer pts" |

---

### Edge Cases

| Scenario | Handling |
|----------|----------|
| No riders entered for brand in an event | User scores 0 manufacturer points for that round; no penalty |
| All riders for brand DNS/DNF | User scores 0 manufacturer points for that round; no penalty |
| EWS partial completion by top brand rider | Partial completion does not count as a finish — next best brand rider with a full finish is used; if none, 0 pts |
| User makes no pick before Round 1 lock | `ManufacturerPick` row never created; user scores 0 manufacturer points for entire season |
| Mid-season brand transfer (rider changes manufacturer) | `Rider.manufacturerId` updated by admin; only matters at time `results.score` runs for each event — historical events are not retroactively re-scored |
| Two brand riders tie for best finish (EWS parallel stages) | Tiebreaker: lower `riderId` lexicographically (deterministic, not material since points are equal) |
| Result override after manufacturer scores written | `results.score` re-run upserts `ManufacturerEventScore` on `@@unique([userId, seriesId, season, eventId])` — safe, idempotent |

---

## Scoring Engine

### Base Points Table

Consistent across all three series:

| Position | Points | Position | Points |
|----------|--------|----------|--------|
| 1st | 30 | 11th | 10 |
| 2nd | 28 | 12th | 9 |
| 3rd | 26 | 13th | 8 |
| 4th | 24 | 14th | 7 |
| 5th | 22 | 15th | 6 |
| 6th | 20 | 16th | 5 |
| 7th | 18 | 17th | 4 |
| 8th | 16 | 18th | 3 |
| 9th | 14 | 19th | 2 |
| 10th | 12 | 20th | 1 |
| 21st+ | 0 | DNS/DNF | −2 |

### Bonus Points

| Bonus | Points | Applies To |
|-------|--------|-----------|
| Fastest qualifier | +5 | DH, XC |
| Stage win | +3 per stage | EWS only |
| Podium finish in home country | +3 | All series |
| Wildcard top 10 (rider picked at under $200K — `isWildcard = true` — finishes top 10) | +5 | All series |
| Perfect round (all 6 riders finish top 20) | +10 to team total | All series |

### Series-Specific Notes

**UCI DH World Cup**
- Points awarded on finals result only
- Qualifying contributes fastest qualifier bonus only
- DNS/DNF penalty applies if rider fails to start or finish finals

**Enduro World Series (EWS)**
- Overall finish position determines base points
- Each individual stage win earns +3 (no cap on stage win bonuses)
- Three-state completion model (EWS only): **full finish** (`finishPosition` set, `dnsDnf = false`, `partialCompletion = false`) = base points from table; **partial completion** (`finishPosition = null`, `partialCompletion = true`, `dnsDnf = false`) = 0 base points, no penalty; **full DNS/DNF** (`dnsDnf = true`, `partialCompletion = false`) = −2 points. The scraper sets `partialCompletion = true` when a rider appears in stage results but has no overall position.

**UCI XC World Cup**
- Circuit race finish position determines base points
- Fastest qualifier bonus applies to the short course qualifying race
- No stage wins

### Scoring Flow

1. Admin confirms race results (or approves scraped results)
2. `results.score` job enqueues
3. Worker copies `finishPosition`, `qualifyingPosition`, `dnsDnf`, and `partialCompletion` from each `RaceResult` into the corresponding `RiderEventEntry` — `RaceResult` is the source of truth; `RiderEventEntry` holds the denormalized copy used for scoring queries and display
4. Worker calculates `fantasyPoints` + `bonusPoints` per `RiderEventEntry` — covers: base points (finish position table), fastest qualifier, stage wins, home-country podium. Note: the "Wildcard top 10" bonus is **not** computed here (it is team-scoped, not rider-scoped — see step 5).
5. Worker calculates `totalPoints` per `FantasyTeam` for that event, including the team-scoped bonuses: (a) "Wildcard top 10" — for each `FantasyPick.isWildcard = true` pick whose rider finished top 10, add +5 to the team total; (b) "Perfect round" — if all 6 picked riders finished top 20, add +10. Checks `SUM(priceAtPick)` vs `salaryCap` — over-budget teams receive `totalPoints = 0` and `isOverBudget = true` on `FantasyEventScore`
6. Writes `FantasyEventScore` records for all teams as **upserts** on `(teamId, eventId)` — idempotent, safe to re-run after result overrides
7. Updates `FantasySeasonScore` cumulative totals
8. Recalculates global leaderboard ranks
9. Recalculates all league standings. League event ranks are **computed dynamically at query time** (ORDER BY totalPoints within league members) — not stored in a separate schema model. Survivor elimination: JOIN `FantasyLeagueMember` on `userId` for survivor leagues → JOIN `FantasyTeam` on `(userId, seriesId, season)` → find lowest `FantasyEventScore.totalPoints` → set `FantasyLeagueMember.eliminatedAt`.
10. Grants XP:
   - `fantasy_team_scored`: 10 XP (all participants)
   - `fantasy_top_10_pct`: 25 XP (top 10% finishers that event)
   - `fantasy_league_won`: 100 XP (friend/survivor league winner — granted when survivor league ends early or at season end)
   - `fantasy_season_completed` and `fantasy_league_won` (season-level) are granted by a separate cron job (`/api/cron/fantasy/close-season`) triggered when `FantasySeries.status` transitions to `completed`
11. Sends score notification email to all participants

### Drop Round (Season Pass Holders Only)

After each event is scored, the scoring worker re-evaluates which `FantasyEventScore` record is the current worst event for each season pass holder and sets `isDropRound = true` on it (clearing the flag from any prior worst event). This means the leaderboard always reflects the running best possible season total — the drop round is applied continuously, not just at season end. At season end, the final `isDropRound = true` event is the one officially excluded from the grand prize calculation.

---

## Paid Tiers

### Free Tier (Default)

All users can:
- Build teams for any event in any series
- Compete in global and friend league leaderboards
- View post-lock ownership percentages
- Join or create friend leagues

Free users **cannot**:
- Win cash or physical prizes
- Use drop round
- Access expert picks before the roster deadline
- Join the Championship League

### Season Pass ($29.99 per series per season)

Purchased via Stripe Checkout. One pass per series per season.

Unlocks:
- **Prize eligibility** — eligible for per-event prizes and season grand prize
- **Drop round** — worst event excluded from season total
- **Expert picks** — view expert's 6 recommended picks before roster deadline
- **Championship League** — access to the paid-only high-stakes leaderboard
- **Priority notifications** — earlier roster reminder emails

### Mulligan Packs (À La Carte)

| Pack | Price |
|------|-------|
| 1 mulligan | $5.00 |
| 3 mulligans | $10.00 |

Available to free and paid users. Usable across any series. Stored as `MulliganBalance` count.

### Expert Picks

- Admin (or designated expert) publishes 6 recommended picks per event via `/admin/fantasy/expert-picks`
- Published any time before the roster deadline
- Season pass holders: full picks revealed on team selection page
- Free users: picks blurred with "Upgrade to Season Pass" prompt
- Post-deadline: all users see expert picks (no competitive advantage once lock has passed)

### Stripe Integration

- Season passes and mulligan packs purchased via Stripe Checkout sessions
- Webhook endpoint: `/api/fantasy/stripe/webhook`
- Handles:
  - `checkout.session.completed` — provision season pass or mulligan balance
  - `checkout.session.expired` — log and discard; no action needed
  - `payment_intent.payment_failed` — log failure, notify user by email with retry link
  - `charge.refunded` — revoke season pass if before first scored event of the season
- Uses existing `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` env vars
- `SeasonPassPurchase` and `MulliganBalance` updated on webhook receipt

### Refund Policy

- Season passes: non-refundable after the first scored event of the season
- Mulligans: non-refundable once consumed

---

## Leagues & Social

### League Types

| League | Who | Prize Eligible | Notes |
|--------|-----|---------------|-------|
| Global League | All users | Season pass holders only | One per series per season |
| Championship League | Season pass holders only | Yes | High-stakes, top 10% prizes |
| Friend Leagues | Any user | No | Unlimited, user-created |
| Survivor Leagues | Any user | No | Opt-in game mode within friend leagues |

### Friend Leagues

- Any user (free or paid) can create a friend league
- Fields: name, avatar, public/private, 6-character invite code, commissioner
- Join via invite code or by browsing public leagues
- Per-series per-season — new league created each season (no automatic rollover)
- Commissioner can rename but cannot remove members
- Unlimited league memberships per user

### Survivor Leagues

Enabled as an option when creating a friend league.

Rules:
- Each event, the lowest-scoring team is eliminated
- Tied last place: eliminated by lowest season total; further tie = lowest `userId` lexicographically (CUIDs sort by creation time, so this effectively means the most recently-joined user is eliminated — a deliberate choice)
- Last team standing wins
- If only 1 team remains before season end, survivor league ends early
- Eliminated users remain in the league as spectators and are shown in the leaderboard below active members, marked with an "Eliminated after [Event Name]" badge

### Leaderboard Display

All leaderboards (global, championship, friend) show:

| Column | Notes |
|--------|-------|
| Rank | Current position |
| Username + avatar | |
| Total points | Drop round applied if applicable |
| Behind leader | Points gap to 1st place |
| Best event | Highest single-event score |
| Worst event | Lowest score (struck through if drop round applied) |
| Prize eligible | Trophy icon for season pass holders |

### Social Layer

- **Auto-created forum thread** per event when roster window opens
  - Title: `"[Series Name] — [Event Name] Fantasy Discussion"`
  - Seeded with event details, race date, roster deadline
  - Linked from the fantasy dashboard for that event
- **Post-lock ownership reply** — automated forum reply posted at roster deadline with full ownership % breakdown for all riders
- **Post-scoring reply** — automated reply with top 3 fantasy teams of the event and their scores
- **XP events** tie fantasy activity into the cross-platform XP system

---

## Results Ingestion Pipeline

### Scraper Architecture

New pg-boss job types in the existing Fly.io worker. Each series has its own scraper handler.

### Job Types

| Job | Trigger | Action |
|-----|---------|--------|
| `results.scrape` | Initial: Vercel cron (`/api/cron/fantasy/scrape-results`, every 30min on Vercel Pro) fires 1hr after scheduled race end by enqueuing job for events where `status = results_pending` and no confirmed results. Retries: same cron re-enqueues every 30min for events that remain `results_pending` with `confirmedAt IS NULL` on all `RaceResult` rows. Termination: once all `RaceResult.confirmedAt` are set for an event (admin confirms results), no further jobs enqueued. | Fetch results page, parse finish order, store raw results + parsed data |
| `results.confirm` | Admin clicks "Confirm Results" in admin panel | Lock results, enqueue `results.score` |
| `results.score` | After `results.confirm` | Calculate fantasy points, update leaderboards, send emails, grant XP |
| `results.override` | Admin edits a single result | Re-run `results.score` for that event |
| `prices.recalculate` | Every pick/drop | Recalculate all rider prices for event, update Redis |
| `prices.reveal` | At roster deadline | Write final ownership % to RiderEventEntry, post to forum thread |

### Scraper Per Series

**UCI DH World Cup**
- Source: `ucimtb.info` official results
- Parse: HTML table via cheerio
- Match riders: UCI ID (stored on `Rider.uciId`)

**Enduro World Series**
- Source: `enduroworldseries.com`
- Parse: Stage results + overall standings
- Match riders: name + nationality (no universal ID system)
- Stage results stored as JSON on `RaceResult.stageResults`

**UCI XC World Cup**
- Source: Same UCI infrastructure as DH, different event codes
- Parse: Same cheerio parser with XC-specific selectors
- Match riders: UCI ID

Each scraper uploads the raw HTML response to object storage (Cloudflare R2 or equivalent) and stores the resulting URL in `RaceResult.rawHtmlUrl` for debugging — not stored directly in Postgres to avoid row bloat. Parsing failures move the job to dead-letter and notify admin to enter results manually.

### Result States

`RaceResult.status` tracks the per-rider result processing state (stored in the `status` field — see schema). This is distinct from `FantasyEvent.status` (which tracks roster lifecycle). A `FantasyEvent` reaches `results_pending` status when `results.scrape` fires; it transitions to `scored` after `results.score` completes.

```
RaceResult.status lifecycle:
pending → scraped → confirmed → scored
                              ↘ override_pending → scored

FantasyEvent.status lifecycle:
upcoming → roster_open → locked → results_pending → scored
```

State transitions:
- `pending` — initial state when `RaceResult` row is created during scrape job
- `scraped` — parser successfully extracted a finish position (or dnsDnf flag)
- `confirmed` — admin clicked "Confirm Results"; locks the result, enqueues `results.score`
- `scored` — `results.score` completed; `RiderEventEntry` denormalized values updated, `FantasyEventScore` written
- `override_pending` — admin submitted an override; triggers re-score without going back through scraper

### Admin Results Panel — `/admin/fantasy/results`

Shows all events in `results_pending` status:
- Scraped results table with "Confirm Results" button (if scrape succeeded)
- Manual entry form (if scrape failed)
- Individual result override — edits single finish position, creates `ResultOverride` record, re-triggers scoring
- Scraper error log for dead-letter jobs

### Data Integrity

Results are append-only. Overrides create new `ResultOverride` records rather than mutating `RaceResult` — full audit trail of all corrections.

---

## Database Schema

### Series & Events

```prisma
model FantasySeries {
  id                String          @id @default(cuid())
  name              String
  discipline        Discipline      // dh | ews | xc
  season            Int
  status            SeriesStatus    // upcoming | active | completed
  salaryCap         Int             @default(150000000) // $1.5M stored in cents: 150_000_000
  sensitivityFactor Float           @default(1.5)
  events            FantasyEvent[]
  teams             FantasyTeam[]
  passes            SeasonPassPurchase[]
  seasonScores      FantasySeasonScore[]
  leagues           FantasyLeague[]
  createdAt         DateTime        @default(now())

  @@unique([discipline, season])
  @@map("fantasy_series")
}

model FantasyEvent {
  id               String           @id @default(cuid())
  seriesId         String
  name             String
  location         String
  country          String
  raceDate         DateTime
  rosterDeadline   DateTime
  status           EventStatus      // upcoming | roster_open | locked | results_pending | scored
  scraperUrl       String
  scraperUrlStages String?          // EWS only
  series           FantasySeries    @relation(...)
  riderEntries     RiderEventEntry[]
  picks            FantasyPick[]
  scores           FantasyEventScore[]
  results          RaceResult[]
  expertPicks      ExpertPick[]
  createdAt        DateTime         @default(now())

  @@index([seriesId, raceDate])
  @@map("fantasy_events")
}
```

### Riders

```prisma
model Rider {
  id           String            @id @default(cuid())
  name         String
  nationality  String
  photoUrl     String?
  uciId        String?           @unique
  gender       Gender            // male | female
  disciplines  Discipline[]
  eventEntries RiderEventEntry[]
  results      RaceResult[]
  createdAt    DateTime          @default(now())

  @@map("riders")
}

model RiderEventEntry {
  id                 String   @id @default(cuid())
  riderId            String
  eventId            String
  basePriceCents     Int
  marketPriceCents   Int
  ownershipPct       Float?   // null until post-lock reveal
  finishPosition     Int?
  qualifyingPosition Int?     // DH/XC only; used for fastest qualifier bonus
  fantasyPoints      Int?
  bonusPoints        Int?
  dnsDnf             Boolean  @default(false)
  partialCompletion  Boolean  @default(false) // EWS only: copied from RaceResult.partialCompletion
  rider              Rider    @relation(...)
  event              FantasyEvent @relation(...)

  @@unique([riderId, eventId])
  @@index([eventId])
  @@map("rider_event_entries")
}
```

### Teams & Picks

```prisma
model FantasyTeam {
  id            String        @id @default(cuid())
  userId        String
  seriesId      String
  season        Int
  user          User          @relation(...)
  series        FantasySeries @relation(...)
  picks         FantasyPick[]
  eventScores   FantasyEventScore[]
  seasonScore   FantasySeasonScore?
  mulliganUses  MulliganUse[]

  @@unique([userId, seriesId, season])
  @@map("fantasy_teams")
}

model FantasyPick {
  id           String    @id @default(cuid())
  teamId       String
  eventId      String
  riderId      String
  isWildcard   Boolean   @default(false)
  priceAtPick  Int       // locked-in price at time of selection
  lockedAt     DateTime? // set at roster deadline
  team         FantasyTeam  @relation(...)
  event        FantasyEvent @relation(...)
  rider        Rider        @relation(...)

  @@unique([teamId, eventId, riderId])
  @@index([teamId, eventId])
  @@map("fantasy_picks")
}
```

### Scoring

```prisma
model FantasyEventScore {
  id           String    @id @default(cuid())
  teamId       String
  eventId      String
  basePoints   Int
  bonusPoints  Int
  totalPoints  Int
  rank         Int       // global rank for this event
  isDropRound  Boolean   @default(false)
  isOverBudget Boolean   @default(false) // true if SUM(priceAtPick) > salaryCap at roster lock; totalPoints forced to 0
  team         FantasyTeam  @relation(...)
  event        FantasyEvent @relation(...)

  @@unique([teamId, eventId])
  @@index([eventId, totalPoints])
  @@map("fantasy_event_scores")
}

model FantasySeasonScore {
  id              String    @id @default(cuid())
  teamId          String    @unique
  seriesId        String    // denormalized from FantasyTeam for query convenience
  season          Int       // denormalized from FantasyTeam for query convenience
  totalPoints     Int       @default(0) // drop-adjusted total: SUM(FantasyEventScore.totalPoints WHERE isDropRound = false) for season pass holders; raw SUM for free users. Recomputed after every event scoring run.
  eventsPlayed    Int       @default(0) // incremented whenever a FantasyEventScore exists for this team (regardless of totalPoints — even 0-point and over-budget events count as played)
  bestEventScore  Int?
  worstEventScore Int?
  rank            Int?
  team            FantasyTeam   @relation(...)
  series          FantasySeries @relation(...)

  @@index([seriesId, season, totalPoints])
  @@map("fantasy_season_scores")
}
```

### Leagues

```prisma
model FantasyLeague {
  id              String   @id @default(cuid())
  name            String
  avatarUrl       String?  // optional league avatar image
  seriesId        String
  season          Int
  createdByUserId String   // the commissioner; can rename the league, cannot remove members
  inviteCode      String   @unique // 6-char nanoid generated in application layer before insert (Prisma has no native nanoid default)
  isPublic        Boolean  @default(true)
  isSurvivor      Boolean  @default(false)
  isChampionship  Boolean  @default(false) // one per series per season, created by admin migration/seed, not user-created
  members         FantasyLeagueMember[]
  series          FantasySeries @relation(...)
  createdBy       User          @relation(...)
  createdAt       DateTime @default(now())

  @@index([seriesId, season])
  @@map("fantasy_leagues")
}

// Championship League uniqueness: enforced via a raw SQL partial unique index in the migration:
//   CREATE UNIQUE INDEX fantasy_leagues_championship_unique
//   ON fantasy_leagues (series_id, season)
//   WHERE is_championship = true;
// Prisma does not support partial unique indexes natively; this must be added as a raw migration step.
// The admin tool at `/admin/fantasy/series` also guards against duplicates at the application layer.
//
// Championship League creation: one record seeded per FantasySeries per season (isChampionship = true).
// Created via admin tool at `/admin/fantasy/series` when a series is activated.
// The checkout.session.completed webhook looks up the Championship League by (seriesId, season, isChampionship = true)
// and inserts a FantasyLeagueMember for the purchaser. No separate opt-in required.

model FantasyLeagueMember {
  id           String    @id @default(cuid())
  leagueId     String
  userId       String
  joinedAt     DateTime  @default(now())
  eliminatedAt DateTime? // survivor mode only
  league       FantasyLeague @relation(...)
  user         User          @relation(...)

  @@unique([leagueId, userId])
  @@map("fantasy_league_members")
}
```

### Paid Tiers

```prisma
model SeasonPassPurchase {
  id              String   @id @default(cuid())
  userId          String
  seriesId        String
  season          Int
  stripeSessionId String   @unique
  status          PassStatus // active | refunded
  createdAt       DateTime @default(now())
  user            User          @relation(...)
  series          FantasySeries @relation(...)

  @@unique([userId, seriesId, season])
  @@map("season_pass_purchases")
}

model MulliganBalance {
  id             String @id @default(cuid())
  userId         String @unique
  totalPurchased Int    @default(0)
  totalUsed      Int    @default(0)
  user           User   @relation(...)

  @@map("mulligan_balances")
}

model MulliganUse {
  id       String   @id @default(cuid())
  userId   String
  teamId   String   // which FantasyTeam received the auto-pick
  eventId  String
  usedAt   DateTime @default(now())
  user     User         @relation(...)
  team     FantasyTeam  @relation(...)
  event    FantasyEvent @relation(...)

  @@unique([teamId, eventId]) // prevents double-consumption on cron retry; idempotency guard
  @@map("mulligan_uses")
}

model ExpertPick {
  id              String   @id @default(cuid())
  eventId         String
  riderId         String
  slot            Int      // 1–6
  publishedAt       DateTime?
  publishedByUserId String?   // nullable — null while draft, set on publish
  event           FantasyEvent @relation(...)
  rider           Rider        @relation(...)

  @@unique([eventId, slot])
  @@unique([eventId, riderId])  // prevent same rider in two slots
  @@map("expert_picks")
}
```

### Results

```prisma
model RaceResult {
  id                String       @id @default(cuid())
  eventId           String
  riderId           String
  status            ResultStatus @default(pending) // pending | scraped | confirmed | scored | override_pending
  finishPosition    Int?         // null for DNS/DNF or EWS partial completion
  qualifyingPosition Int?        // DH/XC only; used for fastest qualifier bonus; null for EWS
  dnsDnf            Boolean      @default(false)
  partialCompletion Boolean      @default(false) // EWS only: rider completed ≥1 stage but has no overall position; scores 0, no penalty
  stageResults      Json?        // EWS stage breakdown
  rawHtmlUrl        String?      // R2 URL to raw HTML; HTML body not stored in Postgres
  scrapedAt         DateTime?
  confirmedAt       DateTime?
  confirmedByUserId String?
  overrides         ResultOverride[]
  event             FantasyEvent @relation(...)
  rider             Rider        @relation(...)

  @@unique([eventId, riderId])
  @@map("race_results")
}

model ResultOverride {
  id                 String   @id @default(cuid())
  raceResultId       String
  previousPosition   Int?     // null if override is DNS/DNF status change only
  newPosition        Int?     // null if override is DNS/DNF status change only
  previousDnsDnf     Boolean
  newDnsDnf          Boolean
  reason             String
  overriddenByUserId String
  createdAt          DateTime @default(now())
  raceResult         RaceResult @relation(...)

  @@map("result_overrides")
}
```

### New Enums

```prisma
enum Discipline {
  dh
  ews
  xc
}

enum SeriesStatus {
  upcoming
  active
  completed
}

enum EventStatus {
  upcoming
  roster_open
  locked
  results_pending
  scored
}

enum PassStatus {
  active
  refunded
}

enum Gender {
  male
  female
}

enum ResultStatus {
  pending          // row created, not yet parsed
  scraped          // parser extracted position/dnsDnf
  confirmed        // admin confirmed; results.score enqueued
  scored           // results.score completed; RiderEventEntry updated
  override_pending // admin submitted override; re-score in progress
}
```

### XP Additions

New events added to `XP_VALUES` in `src/shared/constants/xp-values.ts`:

```typescript
fantasy_team_scored: 10,       // every scored event
fantasy_top_10_pct: 25,        // top 10% finish in an event
fantasy_season_completed: 50,  // completed a full season
fantasy_league_won: 100,       // won a friend or survivor league
```

New module added to `XP_MODULES`:
```typescript
FANTASY: 'fantasy',
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Scraper parse failure | Job → dead-letter, admin notified, manual entry form shown |
| Over-budget team at deadline | Team not scored (0 pts), `FantasyEventScore.isOverBudget = true`, user notified by email |
| Redis unavailable | Fall back to Postgres price read (slower but correct), alert fired |
| Stripe webhook failure | Idempotent retry — `stripeSessionId` unique constraint prevents double-provisioning |
| Scoring job failure | Dead-letter after 3 retries, admin notified, manual re-trigger available |
| Result override after scores sent | Re-score job runs, leaderboards updated, re-notification email sent |
| Mulligan auto-pick fails (no eligible riders in budget) | User entered with 5-rider team, notified, no mulligan consumed |

---

## Implementation Phases

### Phase 1 — Foundation
Admin tools + data model. Series, event, and rider management. Manual result entry. No user-facing gameplay — just the backbone.

**Deliverables:** Schema migrations, `/admin/fantasy/` series/event/rider CRUD, seed pricing tools.

### Phase 2 — Core Game (Static Prices)
Team selection UI, roster management, budget validation, roster lock. Scoring engine (base + bonuses). Global leaderboard. Free tier only. Prices are static seed values — no prediction market yet.

**Deliverables:** `/fantasy/` module pages (dashboard, team, leaderboard, rider research), scoring worker jobs, email notifications, XP integration.

### Phase 3 — Prediction Market
Redis price cache, 15-second polling endpoint, pick/drop price recalculation via Fly.io worker. Ownership % reveal post-lock. Price formula with floor/ceiling/dampening. Forum thread auto-post of ownership data.

**Deliverables:** `prices.recalculate` + `prices.reveal` worker jobs, Redis integration, polling endpoint, price trend arrows in UI.

### Phase 4 — Paid Tiers + Prizes
Stripe Checkout for season passes and mulligan packs. Drop round logic. Expert picks admin publishing + season pass display. Championship League. Prize tracking in admin panel.

**Deliverables:** `/api/fantasy/stripe/webhook`, season pass gating, mulligan balance + use flow, expert picks UI, championship league leaderboard.

### Phase 5 — Leagues & Social
Friend leagues, survivor leagues, invite codes, public league browser. Auto-created forum threads per event. Post-lock ownership posts. Post-scoring result posts.

**Deliverables:** League CRUD, invite code flow, survivor elimination logic, forum thread automation.

### Phase 6 — Results Scraper
Fly.io worker scraper jobs for UCI DH, EWS, XCO. Admin confirmation UI. Result override with audit trail. Vercel cron scheduling.

**Deliverables:** `results.scrape` worker jobs (3 scrapers), admin results panel, `ResultOverride` model.

### Phase 7 — Crankworx (Future)
New `crankworx` discipline. Multi-discipline event structure (one Crankworx stop = multiple sub-events across disciplines). Judged format scoring (slopestyle: placement-based, not timed). Rider discipline cross-over (DH riders competing in pump track, etc.).

**Deliverables:** Schema updates, new scraper, updated scoring engine, Crankworx-specific team building UI.

---

## Out of Scope (This Spec)

- Mobile app (web-first only)
- Live scoring during races (scores calculated after results confirmed)
- Rider salary trading between users (no user-to-user transactions)
- Betting or wagering features (fantasy points only, no real-money prediction markets)
- Video integration with Creator module (future: link rider profiles to creator videos)
- International prize distribution complexity (handled manually by admin at launch)
