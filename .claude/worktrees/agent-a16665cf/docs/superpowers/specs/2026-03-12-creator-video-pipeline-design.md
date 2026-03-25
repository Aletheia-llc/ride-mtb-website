# Creator Video Pipeline — Design Spec

**Date:** 2026-03-12
**Status:** Approved
**Project:** Ride MTB (`/Users/kylewarner/Documents/ride-mtb`)

---

## Overview

A creator monetization platform built into Ride MTB that allows approved mountain bike content creators to publish videos, earn CPM revenue from pre-roll ads served to a targeted MTB audience, and receive payouts via Stripe Connect. The platform uses an automated pipeline to ingest videos submitted via YouTube URL, transcode them for adaptive streaming, host them on Bunny.net CDN, and serve them with VAST-compatible pre-roll ads — giving creators a significantly higher CPM than YouTube's general-audience ad network.

**Legal note:** Downloading and re-hosting YouTube videos requires explicit written consent from each creator, obtained during onboarding via a content licensing attestation. Creators attest they own all rights to the submitted content and authorize Ride MTB to host and monetize it. This does not resolve YouTube's platform ToS (section 5B), which is a known business risk accepted by the operator. The spec proceeds on the basis that creator consent + content licensing agreements are in place prior to any video processing.

---

## Architecture

Three components work together:

### 1. `creators` module (Next.js app — existing Vercel deployment)
A new module under `src/modules/creators/` following existing architecture conventions. Owns all UI: creator profiles, video watch pages, creator dashboard, admin approval panel, and ad campaign management. The Next.js app is responsible for **enqueueing** pg-boss jobs only — it does not consume or process jobs.

### 2. pg-boss job queue (existing Supabase Postgres)
pg-boss is a Node.js job queue that runs on Postgres — no Redis or new infrastructure. Jobs are rows in a `pgboss` schema. The Next.js app enqueues jobs by connecting to pg-boss in enqueue-only mode (using the existing `pg.Pool` instance from `src/lib/db/client.ts`). The Fly.io worker is the **sole consumer** — it connects to pg-boss with a persistent poll loop and dequeues and executes all jobs. Retries, delays, and failure states are built in.

### 3. Fly.io video worker (Docker container)
A standalone Node.js service on Fly.io (~$5-10/month). Secrets injected via Fly.io secrets (`fly secrets set`): `DATABASE_URL` (Supabase session pooler), `BUNNY_STORAGE_API_KEY`, `BUNNY_CDN_HOSTNAME`, `YOUTUBE_API_KEY`, `ANTHROPIC_API_KEY`. Connects to Supabase Postgres via the session pooler, runs a persistent pg-boss consumer loop, and executes: download via yt-dlp → transcode via ffmpeg → upload to Bunny.net → update database.

### Data flow

```
YouTube RSS feed (Vercel cron, every 15 min — requires Vercel Pro plan)
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

### Bunny.net storage path convention
All video assets stored under: `/{creatorId}/{videoId}/` — e.g. `/{creatorId}/{videoId}/index.m3u8`, `/{creatorId}/{videoId}/1080p/seg000.ts`. The CDN URL is constructed as `https://{BUNNY_CDN_HOSTNAME}/{creatorId}/{videoId}/index.m3u8`. This convention is shared between the worker (upload) and the Next.js app (playback).

### Relationship to existing `media` module
`CreatorVideo` is a separate model from `MediaItem`. `MediaItem` handles community photo/video uploads (user-generated, unmonetized). `CreatorVideo` handles creator-published monetized content. There is no inheritance or foreign key relationship between the two — they serve distinct purposes.

---

## Creator Onboarding

### Phase 1 — Invite-only (launch)
Admin generates a signed, single-use invite link from the admin panel. Token is stored as a hash in the `InviteToken` table with a 7-day expiry. On use, the API route checks `expiresAt` and `used` before proceeding; used tokens are immediately marked `used = true` to prevent replay. Creator clicks link, creates or signs into their Ride MTB account, completes their profile, signs the content licensing attestation (checkbox + timestamp stored on `CreatorProfile`), and finishes Stripe Connect Express onboarding (KYC, bank account, tax forms). Status moves to `active` on Stripe Connect completion.

**Stripe Connect onboarding:** Creator is redirected to Stripe's hosted Express onboarding via `stripe.oauth.authorizationUrl()` or the newer `stripe.accountLinks.create()` (Account Links flow). On return, the Stripe account ID is stored on `CreatorProfile.stripeAccountId`. Payouts use Stripe Connect direct transfers to this account.

**Creator states:** `invited → onboarding → active → suspended`

### Phase 2 — Application waitlist (future)
A public `/creators/apply` page. Applicants submit YouTube channel URL, riding style, approximate monthly views, and a short note. Applications land in the admin queue. Approved applicants receive the invite link flow.

### YouTube channel connection
Creator pastes their YouTube channel URL during onboarding. System resolves it to a channel ID via YouTube Data API (read-only, free quota). Immediately enqueues eligible back-catalog videos (up to 50 most recent) as `video.ingest` jobs, staggered at 30-second intervals to prevent the Fly.io worker from being overwhelmed on launch. Eligibility filter: public videos only (`status = public`), not age-restricted, duration > 60 seconds. Private, members-only, deleted, and age-restricted videos are skipped. Ongoing new-video detection uses YouTube RSS (`https://www.youtube.com/feeds/videos.xml?channel_id=...`) polled every 15 minutes via Vercel cron (requires Vercel Pro plan) — no API quota consumed.

**Deduplication:** Before enqueueing any `video.ingest` job, the system checks for an existing `CreatorVideo` row with the same `youtubeVideoId` for that creator. If found, the video is skipped. A unique constraint on `(creatorId, youtubeVideoId)` enforces this at the database level.

**Worker concurrency:** The Fly.io worker processes a maximum of 3 concurrent jobs at launch. Back-catalog imports are given lower priority than RSS-triggered jobs in pg-boss. Concurrency can be increased by scaling the Fly.io machine as demand grows.

---

## Video Ingestion Pipeline

### Job types

| Job | Trigger | Payload |
|-----|---------|---------|
| `video.ingest` | RSS poll or manual URL submission | `{ youtubeVideoId, creatorId, source }` |
| `video.transcode` | After successful download | `{ videoId, localPath }` |
| `video.tag` | After successful upload to Bunny.net | `{ videoId }` |

All jobs: 3-retry policy with exponential backoff. After 3 failures: dead-letter state, surfaced in a new "Video Processing" section under `/admin` with error message and a "Retry" button. Creator notified via email on failure.

### `video.ingest` (Fly.io worker)
1. Fetch YouTube metadata (title, description, thumbnail, duration) via YouTube Data API
2. Create `CreatorVideo` record with status `processing`
3. Download video via yt-dlp (1080p max) to temp directory on Fly.io machine. If YouTube returns HTTP 429 or bot-detection responses, the job is retried with the standard exponential backoff (up to 3 attempts). Persistent 429s are treated as an accepted operational risk — the job moves to dead-letter and an admin is notified.
4. Enqueue `video.transcode` job

### `video.transcode` (Fly.io worker)
1. Run ffmpeg → three HLS outputs: 1080p, 720p, 360p (`.m3u8` + `.ts` segments)
2. Upload all segments to Bunny.net Storage under `/{creatorId}/{videoId}/` path convention
3. Update `CreatorVideo` with Bunny.net HLS URL and status `pending_review`
4. Enqueue `video.tag` job
5. Delete temp files

### `video.tag` (Fly.io worker)
1. Send title + description + yt-dlp transcript to Claude Haiku
2. Prompt returns: suggested categories (fixed enum), suggested trail system matches (matched against existing `TrailSystem` records by name/location), confidence scores
3. Store suggestions on video record as unconfirmed `CreatorVideoTag` rows
4. Creator sees suggestions in dashboard, confirms or edits before video goes live
5. If creator takes no action within 7 days, a reminder email is sent at day 5; at day 7 the video auto-publishes with AI tags marked confirmed and creator receives a notification. Creator can edit tags post-publish.

### Video states
`queued → processing → transcoding → pending_review → live | rejected`

---

## Video Player + Ad System

### Player
Video.js with `videojs-contrib-ads` plugin. Loads Bunny.net HLS stream. Before playback, requests `/api/creators/ads/vast?videoId=...` for a VAST XML response. Empty VAST = no ad available, playback begins immediately. Skip button shown after 5 seconds. VAST version: 2.0 (chosen for broad compatibility; upgrading to VAST 4.x is out of scope but noted as a future consideration if external ad networks are integrated).

### VAST endpoint security
`/api/creators/ads/vast?videoId=` is rate-limited via the existing `src/lib/rate-limit.ts` (Upstash Redis) — 30 requests per IP per minute. The impression tracking endpoint `/api/creators/ads/track` validates that the `impressionId` exists, is in `pending` status, and was created within the last 10 minutes before confirming it. This prevents fake impression generation.

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
2. Find highest-CPM active campaign matching criteria with remaining daily budget; tiebreaker is `createdAt` (oldest campaign wins) to ensure fair spend ordering
3. Return VAST 2.0 XML with ad video URL and tracking URLs. If no eligible campaign exists, return `<VAST version="2.0"/>` with no `<Ad>` element — this is the defined VAST empty response; do not return a 204 or empty body, which `videojs-contrib-ads` treats as an error.
4. Record `pending` impression with `createdAt` timestamp

### Impression tracking
VAST tracking URLs fire automatically from the player:
- `impression` — ad starts playing (billed event)
- `complete` — ad watched fully
- `skip` — viewer skips after 5 seconds

On `impression` received at `/api/creators/ads/track`:
1. Validate `impressionId` exists, is `pending`, and was created within 10 minutes
2. Mark impression `confirmed`
3. Calculate creator earnings: `floor((cpmCents / 1000) × revenueSharePct / 100)` — integer floor division, no fractional cents. Platform retains the remainder. Platform earnings are not stored in the ledger (derived as `impressionTotal - creatorEarnings`).
4. Add `WalletTransaction` of type `earning` with `earningsCents` amount

### Revenue split
Default 70% creator / 30% platform, overridable per creator. Stored as `revenueSharePct` integer on `CreatorProfile`. Wallet credits calculated at impression confirmation time (not batched).

---

## Creator Dashboard, Wallet & Payouts

### Dashboard (`/dashboard/creator`)
Four sections:
- **Videos** — list with status badges, view counts, earnings per video; pending review videos show AI tags awaiting confirmation
- **Analytics** — views over time, top videos, earnings breakdown by video and campaign
- **Wallet** — current balance, transaction history, "Request Payout" button
- **Settings** — profile, YouTube channel connection, notification preferences

### Wallet
Immutable ledger model. Balance is always the sum of all `WalletTransaction` records for the creator — never a mutable stored float. All amounts stored as integers (cents). `CreatorWallet` exists as a join point only (holds `creatorId`) — the balance is computed via `SUM(amountCents)` across `WalletTransaction` rows.

### Payout flow
1. Creator requests payout (minimum $50 / 5000 cents)
2. `PayoutRequest` created with status `pending`; creator's available balance must cover the amount
3. Admin sees pending requests in the "Payouts" section of `/admin`, triggers payout via Stripe Connect direct transfer
4. On Stripe webhook `transfer.paid` confirmation: `PayoutRequest` → `completed`, `WalletTransaction` of type `payout` recorded (negative `amountCents`)
5. Creator receives email notification

**Admin guardrails:** Only users with `admin` role can trigger payouts. No override of the $50 minimum. Frequency: one pending payout request per creator at a time (UI disables "Request Payout" if a pending request exists).

---

## Database Schema

### New models

**`CreatorProfile`**
One-to-one with `User`. Fields: `displayName`, `bio`, `youtubeChannelId`, `revenueSharePct` (default 70), `stripeAccountId`, `status` (enum: `invited | onboarding | active | suspended`), `licensingAttestedAt` (DateTime, nullable — set when creator signs the content licensing attestation).

**`CreatorVideo`**
Fields: `creatorId`, `youtubeVideoId`, `title`, `description`, `thumbnailUrl`, `duration`, `bunnyHlsUrl`, `status` (enum: `queued | processing | transcoding | pending_review | live | rejected`), `viewCount`, `category` (enum), `trailSystemId` (optional FK to `TrailSystem`), `tagsConfirmedAt` (nullable DateTime — set when the creator clicks "Publish" or when the 7-day auto-publish fires; individual `CreatorVideoTag.confirmed` tracks per-tag state, `tagsConfirmedAt` marks the overall publish action). Unique constraint on `(creatorId, youtubeVideoId)`.

**`CreatorVideoTag`**
Fields: `videoId`, `value`, `source` (enum: `ai | manual`), `confirmed` (boolean).

**`AdCampaign`**
Fields: `advertiserName`, `logoUrl`, `creativeUrl`, `cpmCents`, `dailyImpressionCap`, `startDate`, `endDate`, `status` (enum: `active | paused | completed | cancelled`), `categoryFilter` (optional enum value). Creator targeting is handled via a join table (`AdCampaignCreatorTarget`) with fields `campaignId` and `creatorProfileId` — Prisma does not support scalar FK arrays.

**`AdCampaignCreatorTarget`**
Join table for optional creator-level ad targeting. Fields: `campaignId` (FK to `AdCampaign`), `creatorProfileId` (FK to `CreatorProfile`).

**`AdImpression`**
Fields: `campaignId`, `videoId`, `viewerId` (nullable), `status` (enum: `pending | confirmed | skipped`), `earningsCents`, `createdAt`.

**`CreatorWallet`**
One-to-one with `CreatorProfile`. `creatorProfileId` only — balance derived from `WalletTransaction` rows via `SUM(amountCents)`.

**`WalletTransaction`**
Immutable ledger. Fields: `creatorId`, `amountCents` (positive for earnings, negative for payouts), `type` (enum: `earning | payout`), `impressionId` (optional FK), `payoutRequestId` (optional FK), `createdAt`.

**`PayoutRequest`**
Fields: `creatorId`, `amountCents`, `status` (enum: `pending | processing | completed | failed`), `stripeTransferId`.

**`InviteToken`**
Fields: `tokenHash`, `createdByAdminId`, `claimedByUserId` (nullable), `expiresAt`, `used` (boolean).

---

## Error Handling

- **Failed video jobs** — after 3 retries, move to dead-letter state. New "Video Processing" section in `/admin` shows failed jobs with error message and "Retry" button. Creator notified via email.
- **VAST endpoint failure** — returns empty VAST, player proceeds without ad. No impression recorded.
- **Stripe payout failure** — `PayoutRequest` moves to `failed` status. Admin notified. Creator notified with instructions to check their Stripe account.
- **YouTube channel RSS failure** — Vercel cron logs the error, retries on next poll cycle (15 min). No action needed from creator.
- **yt-dlp download failure** — job retried up to 3 times. Common causes: video is private, deleted, or age-restricted. Error message stored on `CreatorVideo` record.

---

## Prerequisites

- Vercel Pro plan (required for cron intervals shorter than 24 hours — 15-minute RSS polling)
- Fly.io account (for video worker deployment)
- Bunny.net account with a Storage Zone and Pull Zone configured
- Stripe account with Connect enabled
- Upstash Redis instance (already used by the app for rate limiting)

---

## Stripe Webhook Events

Webhook endpoint: `/api/stripe/webhook`

| Event | Action |
|-------|--------|
| `account.updated` | Check `details_submitted` + `charges_enabled` on creator's Connect account; update `CreatorProfile.status` to `active` when both are true |
| `transfer.paid` | Mark `PayoutRequest` as `completed`, record `WalletTransaction` of type `payout` |
| `transfer.failed` | Mark `PayoutRequest` as `failed`, notify admin and creator |

---

## Infrastructure & Secrets

| Secret | Where used | Injected via |
|--------|-----------|-------------|
| `DATABASE_URL` | Fly.io worker (pg-boss consumer) | `fly secrets set` |
| `BUNNY_STORAGE_API_KEY` | Fly.io worker (upload) | `fly secrets set` |
| `BUNNY_CDN_HOSTNAME` | Fly.io worker + Next.js app | `fly secrets set` / Vercel env |
| `YOUTUBE_API_KEY` | Fly.io worker + Next.js cron | `fly secrets set` / Vercel env |
| `ANTHROPIC_API_KEY` | Fly.io worker (tagging) | `fly secrets set` |
| `STRIPE_SECRET_KEY` | Next.js app (payouts) | Vercel env |
| `STRIPE_WEBHOOK_SECRET` | Next.js app (webhook) | Vercel env |

Next.js app uses the existing `src/lib/env.ts` for Zod environment validation. Fly.io worker has its own `env.ts` with matching Zod schema for its subset of secrets.

---

## Out of Scope (this spec)

- Self-serve ad campaign portal for brands (Phase 2)
- Automated payout scheduling (Phase 2 — currently admin-triggered)
- Native video upload (no YouTube dependency) — future option
- Creator analytics API for external tools
- Multi-language support for creator dashboard
- VAST 4.x upgrade (noted as future consideration for external ad network integration)
- Frequency capping per viewer per campaign (Phase 2)
