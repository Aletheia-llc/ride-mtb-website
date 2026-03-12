# Creator Video Pipeline — Design Spec

**Date:** 2026-03-12
**Status:** Approved
**Project:** Ride MTB (`/Users/kylewarner/Documents/ride-mtb`)

---

## Overview

A creator monetization platform built into Ride MTB that allows approved mountain bike content creators to publish videos, earn CPM revenue from pre-roll ads served to a targeted MTB audience, and receive payouts via Stripe Connect. The platform uses an automated pipeline to ingest videos submitted via YouTube URL, transcode them for adaptive streaming, host them on Bunny.net CDN, and serve them with VAST-compatible pre-roll ads — giving creators a significantly higher CPM than YouTube's general-audience ad network.

---

## Architecture

Three components work together:

### 1. `creators` module (Next.js app — existing Vercel deployment)
A new module under `src/modules/creators/` following existing architecture conventions. Owns all UI: creator profiles, video watch pages, creator dashboard, admin approval panel, and ad campaign management.

### 2. pg-boss job queue (existing Supabase Postgres)
pg-boss is a Node.js job queue that runs on Postgres — no Redis or new infrastructure. Jobs are rows in a `pgboss` schema. The Next.js app enqueues jobs; the Fly.io worker dequeues and executes them. Retries, delays, and failure states are built in.

### 3. Fly.io video worker (Docker container)
A standalone Node.js service on Fly.io (~$5-10/month). Connects to Supabase Postgres, polls pg-boss for pending jobs, and executes: download via yt-dlp → transcode via ffmpeg → upload to Bunny.net → update database.

### Data flow

```
YouTube RSS feed (Vercel cron, every 15 min)
  → new video detected → pg-boss job enqueued

Creator submits YouTube URL manually
  → API route → pg-boss job enqueued

Fly.io worker picks up job
  → yt-dlp download → ffmpeg transcode (360p/720p/1080p HLS)
  → Bunny.net upload → video record updated to "pending_review"
  → AI tagging job enqueued (Claude Haiku)

Creator reviews AI tags in dashboard → confirms → video goes live

Viewer loads video page
  → VAST pre-roll ad served → impression recorded → video plays from Bunny.net CDN
  → confirmed impression → creator wallet credited
```

---

## Creator Onboarding

### Phase 1 — Invite-only (launch)
Admin generates a signed, single-use invite link from the admin panel. Token expires in 7 days. Creator clicks link, creates or signs into their Ride MTB account, completes their profile, and finishes Stripe Connect Express onboarding (KYC, bank account, tax forms). Status moves to `active` on Stripe Connect completion.

**Creator states:** `invited → onboarding → active → suspended`

### Phase 2 — Application waitlist (future)
A public `/creators/apply` page. Applicants submit YouTube channel URL, riding style, approximate monthly views, and a short note. Applications land in the admin queue. Approved applicants receive the invite link flow.

### YouTube channel connection
Creator pastes their YouTube channel URL during onboarding. System resolves it to a channel ID via YouTube Data API (read-only, free quota). Immediately enqueues the 50 most recent videos as processing jobs (back catalog import). Ongoing new-video detection uses YouTube RSS (`https://www.youtube.com/feeds/videos.xml?channel_id=...`) polled every 15 minutes via Vercel cron — no API quota consumed.

---

## Video Ingestion Pipeline

### Job types

| Job | Trigger | Payload |
|-----|---------|---------|
| `video.ingest` | RSS poll or manual URL submission | `{ youtubeVideoId, creatorId, source }` |
| `video.transcode` | After successful download | `{ videoId, localPath }` |
| `video.tag` | After successful upload to Bunny.net | `{ videoId }` |

All jobs: 3-retry policy with exponential backoff. After 3 failures: dead-letter state, visible in admin panel.

### `video.ingest` (Fly.io worker)
1. Fetch YouTube metadata (title, description, thumbnail, duration) via YouTube Data API
2. Create `CreatorVideo` record with status `processing`
3. Download video via yt-dlp (1080p max) to temp directory
4. Enqueue `video.transcode` job

### `video.transcode` (Fly.io worker)
1. Run ffmpeg → three HLS outputs: 1080p, 720p, 360p (`.m3u8` + `.ts` segments)
2. Upload all segments to Bunny.net Storage via API
3. Update `CreatorVideo` with Bunny.net HLS URL and status `pending_review`
4. Enqueue `video.tag` job
5. Delete temp files

### `video.tag` (Fly.io worker)
1. Send title + description + yt-dlp transcript to Claude Haiku
2. Prompt returns: suggested categories (fixed enum), suggested trail system matches (matched against existing `TrailSystem` records), confidence scores
3. Store suggestions on video record
4. Creator sees suggestions in dashboard, confirms or edits before video goes live

### Video states
`queued → processing → transcoding → pending_review → live | rejected`

---

## Video Player + Ad System

### Player
Video.js with `videojs-contrib-ads` plugin. Loads Bunny.net HLS stream. Before playback, requests `/api/creators/ads/vast?videoId=...` for a VAST XML response. Empty VAST = no ad available, playback begins immediately. Skip button shown after 5 seconds.

### Ad campaigns (admin-managed)
Admin creates campaigns in the admin panel:
- Advertiser name + logo
- Video creative (uploaded to Bunny.net)
- CPM rate (integer cents)
- Daily impression cap
- Start/end dates
- Optional targeting: category filter, creator filter

### VAST endpoint
`GET /api/creators/ads/vast?videoId=xyz`
1. Look up video category and creator
2. Find highest-CPM active campaign matching criteria with remaining daily budget
3. Return VAST 2.0 XML with ad video URL and tracking URLs
4. Record `pending` impression

### Impression tracking
VAST tracking URLs fire automatically from the player:
- `impression` — ad starts playing (billed event)
- `complete` — ad watched fully
- `skip` — viewer skips after 5 seconds

On `impression` received at `/api/creators/ads/track`:
1. Mark impression `confirmed`
2. Calculate creator earnings: `(CPM / 1000) × revenue_share` (default 70%)
3. Add `WalletTransaction` of type `earning`

### Revenue split
Default 70% creator / 30% platform. Configurable per-creator, stored on `CreatorProfile`.

---

## Creator Dashboard, Wallet & Payouts

### Dashboard (`/dashboard/creator`)
Four sections:
- **Videos** — list with status badges, view counts, earnings per video; pending review videos show AI tags awaiting confirmation
- **Analytics** — views over time, top videos, earnings breakdown by video and campaign
- **Wallet** — current balance, transaction history, "Request Payout" button
- **Settings** — profile, YouTube channel connection, notification preferences

### Wallet
Immutable ledger model. Balance is always the sum of all `WalletTransaction` records — never a mutable float. All amounts stored as integers (cents).

### Payout flow
1. Creator requests payout (minimum $50)
2. `PayoutRequest` created with status `pending`
3. Admin sees pending requests in admin panel, triggers payout via Stripe Connect
4. On Stripe webhook confirmation: `PayoutRequest` → `completed`, `WalletTransaction` of type `payout` recorded
5. Creator receives email notification

---

## Database Schema

### New models

**`CreatorProfile`**
One-to-one with `User`. Fields: `displayName`, `bio`, `youtubeChannelId`, `revenueSharePct` (default 70), `stripeAccountId`, `status` (enum: `invited | onboarding | active | suspended`).

**`CreatorVideo`**
Fields: `creatorId`, `youtubeVideoId`, `title`, `description`, `thumbnailUrl`, `duration`, `bunnyHlsUrl`, `status` (enum: `queued | processing | transcoding | pending_review | live | rejected`), `viewCount`, `category` (enum), `trailSystemId` (optional FK to `TrailSystem`).

**`CreatorVideoTag`**
Fields: `videoId`, `value`, `source` (enum: `ai | manual`), `confirmed` (boolean).

**`AdCampaign`**
Fields: `advertiserName`, `logoUrl`, `creativeUrl`, `cpmCents`, `dailyImpressionCap`, `startDate`, `endDate`, `status`, `categoryFilter` (optional), `creatorFilter` (optional FK array).

**`AdImpression`**
Fields: `campaignId`, `videoId`, `viewerId` (nullable), `status` (enum: `pending | confirmed | skipped`), `earningsCents`.

**`CreatorWallet`**
One-to-one with `CreatorProfile`. ID only — balance derived from transactions.

**`WalletTransaction`**
Immutable ledger. Fields: `creatorId`, `amountCents`, `type` (enum: `earning | payout`), `impressionId` (optional FK), `payoutRequestId` (optional FK).

**`PayoutRequest`**
Fields: `creatorId`, `amountCents`, `status` (enum: `pending | processing | completed | failed`), `stripeTransferId`.

**`InviteToken`**
Fields: `tokenHash`, `createdByAdminId`, `claimedByUserId` (nullable), `expiresAt`, `used` (boolean).

---

## Error Handling

- **Failed video jobs** — after 3 retries, move to dead-letter state. Admin panel shows failed jobs with error message and a "Retry" button. Creator notified via email.
- **VAST endpoint failure** — returns empty VAST, player proceeds without ad. No impression recorded.
- **Stripe payout failure** — `PayoutRequest` moves to `failed` status. Admin notified. Creator notified with instructions to check their Stripe account.
- **YouTube channel RSS failure** — Vercel cron logs the error, retries on next poll cycle (15 min). No action needed from creator.
- **yt-dlp download failure** — job retried up to 3 times. Common cause: video is private or deleted. Error message stored on video record.

---

## Out of Scope (this spec)

- Self-serve ad campaign portal for brands (Phase 2)
- Automated payout scheduling (Phase 2 — currently admin-triggered)
- Native video upload (no YouTube dependency) — future option
- Creator analytics API for external tools
- Multi-language support for creator dashboard
