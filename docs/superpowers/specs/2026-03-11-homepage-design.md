# Homepage Design Spec
**Date:** 2026-03-11
**Status:** Approved

## Overview

A Pinkbike-style 3-column magazine layout with a personalized center feed. Logged-out visitors see a full-width marketing hero above the layout. Logged-in users land directly in their personalized "For You" feed. Personalization is driven by explicit interest tags (set at signup), profile data, and behavioral signals tracked in Redis.

---

## Layout

### 3-Column Structure

```
[ Left Sidebar 180px ] [ Center Feed fluid ] [ Right Sidebar 200px ]
```

The layout sits inside a `max-width: 1200px` container, matching the existing `--max-content-width` token. Columns are separated by a 12px gap.

### Top Navigation

Existing site nav (`RIDE MTB` logo + module links + Sign In / Join Free). No changes needed.

---

## Logged-Out Experience

A full-width **marketing hero** renders above the 3-column layout when the user is not authenticated:

- Background: `--color-primary-dark` (#1b4332)
- Headline: *"The mountain biking platform built for riders, by riders"*
- Subheadline: *"Learn skills · Explore trails · Connect with the community"*
- CTAs: "Join Free" (primary green button) + "Sign In" (ghost button)
- Collapses entirely once the user is authenticated — zero remnant UI

**Feed differences when logged out:**
- Tabs read "Trending / Latest / Popular" (no "For You")
- Center feed shows popularity-ranked content — no personalization, no "reason" labels
- Left sidebar XP widget is replaced with a "Join Ride MTB" signup card
- A slim dismissible banner at the top of the feed: *"Sign up to personalize your feed →"*

---

## Center Feed

### Tabs

| Tab | Logged-in label | Logged-out label | Sort |
|-----|----------------|-----------------|------|
| 1 | For You | Trending | Personalization score (logged-in) / engagement count (logged-out) |
| 2 | Latest | Latest | `createdAt` descending |
| 3 | Popular | Popular | Engagement count, last 7 days |

Tab state is client-side only (no URL param needed for v1). Switching tabs re-fetches from `/api/feed?tab=<tab>&cursor=<cursor>`.

### Feed Cards

Six content types, each rendered by `<FeedCard>` with a shared wrapper:

| Type | Key fields shown |
|------|-----------------|
| 📚 Course | Title, progress bar (if started), duration, difficulty badge |
| 🗺 Trail | Name, trail system, skill level, trail count |
| 💬 Forum | Thread title, reply count, category tag |
| 📅 Event | Name, date, location |
| ⭐ Gear Review | Product name, star rating, tags |
| 🛒 Buy/Sell | Item title, price, location |

Every card on the "For You" tab includes a **reason label** — a small italic line explaining why the item was surfaced (e.g. *"✦ Matches your ride style"*, *"✦ Based on Bike Tech interest"*, *"✦ Near your saved trails"*). Reason labels are omitted on Latest and Popular tabs.

### Infinite Scroll / Load More

V1 uses a "Load more" button (not auto-scroll). Cursor-based pagination via `cursor` query param. Page size: 10 items.

---

## Personalization System

### Three Signal Layers (all active simultaneously)

**1. Signup Interest Tags**
During onboarding, users pick 3–5 tags from:
`Trail` · `Enduro` · `Downhill` · `XC` · `Bike Tech` · `Skills Coaching` · `Events & Racing` · `Gear Reviews` · `Buy & Sell`

Stored on the `User` model as a `String[]` field (`interests`). Bootstraps the feed immediately on day one.

**2. Profile Signals**
Existing profile fields used as weighting inputs:
- `skillLevel` → weights course difficulty, trail difficulty
- `ridingStyle` → weights content category (e.g. "Downhill / Freeride" boosts DH trails, gravity forum threads)
- `location` → weights event proximity and nearby trail systems

**3. Behavioral Signals (Redis)**
Lightweight score increments stored in Upstash Redis. Key format: `feed:scores:{userId}`.

| Action | Score increment |
|--------|---------------|
| Click a trail card | `trail` +1 |
| Click a forum thread | `forum:{categorySlug}` +1 |
| Start a course | `learn:{category}` +2 |
| Complete a quiz | `learn:{category}` +3 |
| RSVP / view an event | `events` +1 |
| Click a gear review | `reviews` +1 |
| Click a buy/sell listing | `buysell` +1 |

Scores decay by 10% per week (TTL-based via Redis `EXPIRE`). Feed re-ranks on every page load using current scores.

### Ranking Algorithm

For the "For You" tab, each candidate item receives a score:

```
score = base_engagement_score
      + interest_tag_boost      (if item category matches user's tags: +5)
      + profile_boost           (if item matches skill/style/location: +3)
      + behavior_boost          (redis score for item's category)
      - age_penalty             (items older than 14 days: -2 per day over)
```

Items are fetched, scored in-memory, and sorted. No ML — deterministic and auditable.

---

## Left Sidebar

### Logged-In

1. **XP Widget** — gradient card showing XP earned this week, progress bar to next level, current streak
2. **Your Interests** — list of the user's interest tags with a star indicator, "+ Edit interests" link
3. **Trending Now** — top 5 most-engaged forum threads/trails/events in the last 24h, with reply/view counts

### Logged-Out

1. **Join Ride MTB card** — brief pitch ("Learn, ride, connect") + "Join Free" CTA
2. **Trending Now** — same as logged-in

---

## Right Sidebar

1. **Ad Slot** — 300×250 IAB rectangle. Uses the existing `<AdSlot>` component.
2. **Explore** — quick-links to all 6 main modules (Learn, Trails, Forum, Events, Reviews, Buy/Sell)
3. **Upcoming Events** — next 3 events ordered by date, with date/title/location

---

## Data Fetching

`src/app/page.tsx` is a **server component**. It:
1. Reads the session via `auth()`
2. Fetches initial feed items (10) via `getFeedItems({ userId, tab: 'forYou' })`
3. Fetches sidebar data in parallel: `getTrendingItems()`, `getUpcomingEvents(3)`, `getUserXpSummary(userId)`
4. Passes all data as props to client components

The feed API route (`/api/feed`) handles tab-switching and pagination requests from the client.

---

## New Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Server component — replaces boilerplate, fetches all data |
| `src/modules/feed/lib/queries.ts` | Feed data fetching and candidate selection |
| `src/modules/feed/lib/personalization.ts` | Scoring/ranking logic using Redis scores |
| `src/modules/feed/components/FeedCard.tsx` | Renders any content type as a feed card |
| `src/modules/feed/components/FeedClient.tsx` | Tab state + load more button |
| `src/modules/feed/components/HeroSection.tsx` | Logged-out marketing hero |
| `src/modules/feed/components/LeftSidebar.tsx` | XP widget + interests + trending |
| `src/modules/feed/components/RightSidebar.tsx` | Ad slot + explore links + events |
| `src/app/api/feed/route.ts` | API route for tab switching + pagination |

---

## Schema Change

Add `interests String[]` to the `User` model in `prisma/schema.prisma`. Default: `[]`.

---

## Out of Scope (v1)

- Interest tag picker UI during signup onboarding (v1 uses profile edit page)
- Collaborative filtering ("users like you also liked")
- Real-time feed updates via WebSocket
- "Mute" or "Not interested" controls on cards
