# Creator Video Pipeline — Phase 1: Onboarding Framework

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the creator onboarding infrastructure — admin invite flow, creator profile setup, Stripe Connect, and creator dashboard skeleton — giving creators a path from invite link to active status, without touching the video pipeline.

**Architecture:** Admin generates single-use invite tokens (hashed, 7-day expiry, stored in DB) → creator follows link, creates profile, signs licensing attestation → Stripe Connect Express (Account Links flow) handles KYC and bank account → `account.updated` webhook activates creator → creator dashboard shows their status with empty-state placeholders for Phase 2 video/wallet features.

**Tech Stack:** Next.js 15 App Router, Prisma v7 + Supabase (session pooler), Stripe Connect (Account Links), Node.js `crypto` (invite tokens), Vitest (tests), Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-12-creator-video-pipeline-design.md`

---

## Chunk 1: Foundation

### Task 1: Install Stripe + env additions

**Files:**
- Modify: `package.json` (install stripe)
- Modify: `src/lib/env.ts`

- [ ] **Step 1: Install the Stripe npm package**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npm install stripe
```

Expected: `stripe@latest` added to `package.json` dependencies.

- [ ] **Step 2: Add STRIPE_WEBHOOK_SECRET to env.ts**

`src/lib/env.ts` already has `STRIPE_SECRET_KEY: z.string().optional()`. Add `STRIPE_WEBHOOK_SECRET` in the same optional block:

```typescript
// In the envSchema object, after STRIPE_SECRET_KEY:
STRIPE_WEBHOOK_SECRET: z.string().optional(),
```

- [ ] **Step 3: Run tests — confirm nothing broken**

```bash
npx vitest run
```

Expected: 104 passed.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/env.ts
git commit -m "feat: install stripe SDK, add STRIPE_WEBHOOK_SECRET env var"
```

---

### Task 2: Schema additions — 10 new creator models

**Files:**
- Modify: `prisma/schema.prisma`

Add 10 new models (`CreatorProfile`, `CreatorVideo`, `CreatorVideoTag`, `AdCampaign`, `AdCampaignCreatorTarget`, `AdImpression`, `CreatorWallet`, `WalletTransaction`, `PayoutRequest`, `InviteToken`) and 8 new enums, plus relations on `User` and `TrailSystem`.

- [ ] **Step 1: Add 8 new enums at the bottom of prisma/schema.prisma**

Append after the last enum:

```prisma
enum CreatorStatus {
  invited
  onboarding
  active
  suspended
}

enum VideoStatus {
  queued
  processing
  transcoding
  pending_review
  live
  rejected
}

enum VideoCategory {
  riding_skills
  maintenance
  fitness
  gear
  trails
  other
}

enum TagSource {
  ai
  manual
}

enum AdCampaignStatus {
  active
  paused
  completed
  cancelled
}

enum ImpressionStatus {
  pending
  confirmed
  skipped
}

enum PayoutRequestStatus {
  pending
  processing
  completed
  failed
}

enum WalletTransactionType {
  earning
  payout
}
```

- [ ] **Step 2: Add a new CREATORS section with 10 models**

Append after the enums:

```prisma
// ============================================================
// CREATORS
// ============================================================

model CreatorProfile {
  id                  String        @id @default(cuid())
  userId              String        @unique
  displayName         String
  bio                 String?       @db.Text
  youtubeChannelId    String?
  revenueSharePct     Int           @default(70)
  stripeAccountId     String?
  status              CreatorStatus @default(onboarding)
  licensingAttestedAt DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  user                User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  videos              CreatorVideo[]
  wallet              CreatorWallet?
  walletTransactions  WalletTransaction[]
  payoutRequests      PayoutRequest[]
  campaignTargets     AdCampaignCreatorTarget[]

  @@map("creator_profiles")
}

model CreatorVideo {
  id             String         @id @default(cuid())
  creatorId      String
  youtubeVideoId String
  title          String
  description    String?        @db.Text
  thumbnailUrl   String?
  duration       Int?
  bunnyHlsUrl    String?
  status         VideoStatus    @default(queued)
  viewCount      Int            @default(0)
  category       VideoCategory  @default(other)
  trailSystemId  String?
  tagsConfirmedAt DateTime?
  errorMessage   String?        @db.Text
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  creator        CreatorProfile @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  trailSystem    TrailSystem?   @relation(fields: [trailSystemId], references: [id])
  tags           CreatorVideoTag[]
  impressions    AdImpression[]

  @@unique([creatorId, youtubeVideoId])
  @@index([creatorId, status])
  @@map("creator_videos")
}

model CreatorVideoTag {
  id        String       @id @default(cuid())
  videoId   String
  value     String
  source    TagSource    @default(ai)
  confirmed Boolean      @default(false)
  video     CreatorVideo @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@index([videoId])
  @@map("creator_video_tags")
}

model AdCampaign {
  id                 String           @id @default(cuid())
  advertiserName     String
  logoUrl            String?
  creativeUrl        String
  cpmCents           Int
  dailyImpressionCap Int
  startDate          DateTime
  endDate            DateTime
  status             AdCampaignStatus @default(active)
  categoryFilter     VideoCategory?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  creatorTargets     AdCampaignCreatorTarget[]
  impressions        AdImpression[]

  @@index([status, startDate, endDate])
  @@map("ad_campaigns")
}

model AdCampaignCreatorTarget {
  campaignId       String
  creatorProfileId String
  campaign         AdCampaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  creator          CreatorProfile @relation(fields: [creatorProfileId], references: [id], onDelete: Cascade)

  @@id([campaignId, creatorProfileId])
  @@map("ad_campaign_creator_targets")
}

model AdImpression {
  id            String           @id @default(cuid())
  campaignId    String
  videoId       String
  viewerId      String?
  status        ImpressionStatus @default(pending)
  earningsCents Int              @default(0)
  createdAt     DateTime         @default(now())
  campaign      AdCampaign       @relation(fields: [campaignId], references: [id])
  video         CreatorVideo     @relation(fields: [videoId], references: [id])
  transactions  WalletTransaction[]

  @@index([campaignId, status])
  @@index([videoId])
  @@map("ad_impressions")
}

model CreatorWallet {
  id               String         @id @default(cuid())
  creatorProfileId String         @unique
  creator          CreatorProfile @relation(fields: [creatorProfileId], references: [id], onDelete: Cascade)

  @@map("creator_wallets")
}

model WalletTransaction {
  id              String                @id @default(cuid())
  creatorId       String
  amountCents     Int
  type            WalletTransactionType
  impressionId    String?
  payoutRequestId String?
  createdAt       DateTime              @default(now())
  creator         CreatorProfile        @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  impression      AdImpression?         @relation(fields: [impressionId], references: [id])
  payoutRequest   PayoutRequest?        @relation(fields: [payoutRequestId], references: [id])

  @@index([creatorId, createdAt])
  @@map("wallet_transactions")
}

model PayoutRequest {
  id               String              @id @default(cuid())
  creatorId        String
  amountCents      Int
  status           PayoutRequestStatus @default(pending)
  stripeTransferId String?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  creator          CreatorProfile      @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  transactions     WalletTransaction[]

  @@index([creatorId, status])
  @@map("payout_requests")
}

model InviteToken {
  id               String   @id @default(cuid())
  tokenHash        String   @unique
  createdByAdminId String
  claimedByUserId  String?
  expiresAt        DateTime
  used             Boolean  @default(false)
  createdAt        DateTime @default(now())

  @@index([tokenHash])
  @@map("invite_tokens")
}
```

- [ ] **Step 3: Add relations to existing User and TrailSystem models**

In the `User` model, after `coachProfile CoachProfile?` add:

```prisma
  creatorProfile  CreatorProfile?
```

In the `TrailSystem` model, after `trails Trail[]` add:

```prisma
  creatorVideos   CreatorVideo[]
```

- [ ] **Step 4: Push schema and regenerate client**

```bash
npx prisma db push
```

Expected: "All migration steps were applied." — Prisma regenerates `src/generated/prisma/client/`.

- [ ] **Step 5: Verify generated client contains new types**

```bash
grep -l "CreatorProfile\|InviteToken" src/generated/prisma/client/*.d.ts | head -3
```

Expected: at least one file path returned.

- [ ] **Step 6: Run tests — confirm no regressions**

```bash
npx vitest run
```

Expected: 104 passed.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/generated/
git commit -m "feat: creator pipeline schema — 10 new models, 8 enums"
```

---

## Chunk 2: Invite System

### Task 3: Invite token library (TDD)

**Files:**
- Create: `src/modules/creators/lib/invites.ts`
- Create: `src/modules/creators/lib/invites.test.ts`

Raw tokens go in invite URLs; only the SHA-256 hash is stored in the DB — so a DB breach doesn't expose usable links.

- [ ] **Step 1: Write the failing test**

Create `src/modules/creators/lib/invites.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db/client'

vi.mock('@/lib/db/client', () => ({
  db: {
    inviteToken: {
      findUnique: vi.fn(),
    },
  },
}))

import { generateInviteToken, hashToken, validateInvite } from './invites'

beforeEach(() => vi.clearAllMocks())

describe('generateInviteToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateInviteToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns a different token each time', () => {
    expect(generateInviteToken()).not.toBe(generateInviteToken())
  })
})

describe('hashToken', () => {
  it('returns a 64-character sha256 hex hash', () => {
    expect(hashToken('abc123')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same input yields same hash', () => {
    expect(hashToken('abc123')).toBe(hashToken('abc123'))
  })

  it('different inputs yield different hashes', () => {
    expect(hashToken('abc123')).not.toBe(hashToken('xyz789'))
  })
})

describe('validateInvite', () => {
  it('returns null when token not found in DB', async () => {
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce(null)
    expect(await validateInvite('nonexistent')).toBeNull()
  })

  it('returns null when token is already used', async () => {
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce({
      id: 'tok-1', tokenHash: hashToken('used-token'), used: true,
      expiresAt: new Date(Date.now() + 86400000),
      createdByAdminId: 'admin-1', claimedByUserId: null, createdAt: new Date(),
    } as never)
    expect(await validateInvite('used-token')).toBeNull()
  })

  it('returns null when token is expired', async () => {
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce({
      id: 'tok-1', tokenHash: hashToken('expired-token'), used: false,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      createdByAdminId: 'admin-1', claimedByUserId: null, createdAt: new Date(),
    } as never)
    expect(await validateInvite('expired-token')).toBeNull()
  })

  it('returns the token record when valid', async () => {
    const mockToken = {
      id: 'tok-1', tokenHash: hashToken('valid-token'), used: false,
      expiresAt: new Date(Date.now() + 86400000),
      createdByAdminId: 'admin-1', claimedByUserId: null, createdAt: new Date(),
    }
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce(mockToken as never)
    expect(await validateInvite('valid-token')).toBe(mockToken)
  })

  it('queries DB using the hash of the provided token', async () => {
    vi.mocked(db.inviteToken.findUnique).mockResolvedValueOnce(null)
    await validateInvite('my-raw-token')
    expect(db.inviteToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('my-raw-token') },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/modules/creators/lib/invites.test.ts
```

Expected: FAIL — "Cannot find module './invites'"

- [ ] **Step 3: Implement invites.ts**

Create `src/modules/creators/lib/invites.ts`:

```typescript
import { randomBytes, createHash } from 'node:crypto'
import { db } from '@/lib/db/client'

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function validateInvite(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const record = await db.inviteToken.findUnique({ where: { tokenHash } })
  if (!record) return null
  if (record.used) return null
  if (record.expiresAt < new Date()) return null
  return record
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/modules/creators/lib/invites.test.ts
```

Expected: 10 passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/creators/lib/invites.ts src/modules/creators/lib/invites.test.ts
git commit -m "feat: invite token generation and validation library (TDD)"
```

---

### Task 4: generateInvite server action (TDD)

**Files:**
- Create: `src/modules/creators/actions/generateInvite.ts`
- Create: `src/modules/creators/actions/generateInvite.test.ts`

Admin-only server action: generates a token, stores the hash in `InviteToken`, returns the full invite URL to display in the admin panel.

- [ ] **Step 1: Write the failing test**

Create `src/modules/creators/actions/generateInvite.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

vi.mock('@/lib/auth/guards', () => ({ requireAdmin: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: { inviteToken: { create: vi.fn() } },
}))
vi.mock('../lib/invites', () => ({
  generateInviteToken: vi.fn().mockReturnValue('test-raw-token-abc123'),
  hashToken: vi.fn().mockReturnValue('test-hashed-token-xyz'),
}))

import { generateInvite } from './generateInvite'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAdmin).mockResolvedValue({ id: 'admin-user-1' } as any)
  vi.mocked(db.inviteToken.create).mockResolvedValue({
    id: 'invite-1', tokenHash: 'test-hashed-token-xyz', used: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByAdminId: 'admin-user-1', claimedByUserId: null, createdAt: new Date(),
  } as any)
})

describe('generateInvite', () => {
  it('creates an InviteToken record with the hash (not the raw token)', async () => {
    await generateInvite({ errors: {} }, new FormData())
    expect(db.inviteToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenHash: 'test-hashed-token-xyz',
          createdByAdminId: 'admin-user-1',
          used: false,
        }),
      })
    )
  })

  it('returns success with invite URL containing the raw token', async () => {
    const result = await generateInvite({ errors: {} }, new FormData())
    expect(result.success).toBe(true)
    expect(result.inviteUrl).toContain('/creators/onboarding?token=test-raw-token-abc123')
  })

  it('throws NEXT_REDIRECT when called by non-admin', async () => {
    vi.mocked(requireAdmin).mockImplementationOnce(() => {
      const err = new Error('NEXT_REDIRECT')
      throw err
    })
    await expect(generateInvite({ errors: {} }, new FormData())).rejects.toThrow('NEXT_REDIRECT')
  })

  it('returns error when DB create fails', async () => {
    vi.mocked(db.inviteToken.create).mockRejectedValueOnce(new Error('DB error'))
    const result = await generateInvite({ errors: {} }, new FormData())
    expect(result.errors.general).toBeDefined()
    expect(result.success).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/modules/creators/actions/generateInvite.test.ts
```

Expected: FAIL — "Cannot find module './generateInvite'"

- [ ] **Step 3: Implement generateInvite.ts**

Create `src/modules/creators/actions/generateInvite.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { generateInviteToken, hashToken } from '../lib/invites'

export type GenerateInviteState = {
  errors: Record<string, string>
  success?: boolean
  inviteUrl?: string
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function generateInvite(
  _prevState: GenerateInviteState,
  _formData: FormData,
): Promise<GenerateInviteState> {
  try {
    const admin = await requireAdmin()
    const rawToken = generateInviteToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

    await db.inviteToken.create({
      data: { tokenHash, createdByAdminId: admin.id, expiresAt, used: false },
    })

    revalidatePath('/admin/creators')

    const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000'
    return {
      errors: {},
      success: true,
      inviteUrl: `${baseUrl}/creators/onboarding?token=${rawToken}`,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return { errors: { general: 'Failed to generate invite. Please try again.' } }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/modules/creators/actions/generateInvite.test.ts
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/creators/actions/generateInvite.ts src/modules/creators/actions/generateInvite.test.ts
git commit -m "feat: generateInvite admin server action (TDD)"
```

---

### Task 5: Admin creators page

**Files:**
- Create: `src/modules/creators/lib/queries.ts`
- Create: `src/modules/creators/components/InviteButton.tsx`
- Create: `src/modules/creators/components/AdminCreatorPanel.tsx`
- Create: `src/modules/creators/index.ts`
- Create: `src/app/admin/creators/page.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create queries.ts**

Create `src/modules/creators/lib/queries.ts`:

```typescript
import 'server-only'
import { db } from '@/lib/db/client'

export async function getCreators() {
  return db.creatorProfile.findMany({
    include: {
      user: { select: { id: true, email: true, name: true, image: true } },
      _count: { select: { videos: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCreatorByUserId(userId: string) {
  return db.creatorProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, email: true, name: true, image: true } },
      _count: { select: { videos: true } },
    },
  })
}
```

- [ ] **Step 2: Create InviteButton.tsx (client component)**

Create `src/modules/creators/components/InviteButton.tsx`:

```typescript
'use client'

import { useActionState } from 'react'
import { generateInvite, type GenerateInviteState } from '../actions/generateInvite'

export function InviteButton() {
  const [state, action, isPending] = useActionState<GenerateInviteState, FormData>(
    generateInvite,
    { errors: {} },
  )

  return (
    <div className="space-y-3">
      <form action={action}>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
        >
          {isPending ? 'Generating...' : 'Generate Invite Link'}
        </button>
      </form>

      {state.errors.general && (
        <p className="text-sm text-red-500">{state.errors.general}</p>
      )}

      {state.success && state.inviteUrl && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <p className="mb-1 text-xs font-medium text-green-700">
            Invite link generated — share this with the creator:
          </p>
          <code className="block break-all rounded bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text)]">
            {state.inviteUrl}
          </code>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(state.inviteUrl!)}
            className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create AdminCreatorPanel.tsx (server component)**

Create `src/modules/creators/components/AdminCreatorPanel.tsx`:

```typescript
import { getCreators } from '../lib/queries'
import { InviteButton } from './InviteButton'

const STATUS_COLORS: Record<string, string> = {
  invited: 'bg-yellow-500/10 text-yellow-600',
  onboarding: 'bg-blue-500/10 text-blue-600',
  active: 'bg-green-500/10 text-green-600',
  suspended: 'bg-red-500/10 text-red-600',
}

export async function AdminCreatorPanel() {
  const creators = await getCreators()

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-1 text-lg font-semibold text-[var(--color-text)]">Invite a Creator</h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Generates a single-use invite link valid for 7 days.
        </p>
        <InviteButton />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
          Creators ({creators.length})
        </h2>
        {creators.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No creators yet. Generate an invite link to get started.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-secondary)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Creator</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Videos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {creators.map((c) => (
                  <tr key={c.id} className="bg-[var(--color-surface)]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text)]">{c.displayName}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{c.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{c._count.videos}</td>
                    <td className="px-4 py-3 text-xs">
                      {c.stripeAccountId
                        ? <span className="text-green-600">Connected</span>
                        : <span className="text-[var(--color-text-muted)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create admin/creators/page.tsx**

Create `src/app/admin/creators/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { AdminCreatorPanel } from '@/modules/creators/components/AdminCreatorPanel'

export const metadata: Metadata = {
  title: 'Creator Management | Admin | Ride MTB',
}

export default function AdminCreatorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Creator Management</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Manage creator invites, profiles, and payout settings.
        </p>
      </div>
      <AdminCreatorPanel />
    </div>
  )
}
```

- [ ] **Step 5: Add "Creators" link to admin layout nav**

In `src/app/admin/layout.tsx`, after the Users `<a>` tag add:

```typescript
<a
  href="/admin/creators"
  className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
>
  Creators
</a>
```

- [ ] **Step 6: Create barrel exports**

Create `src/modules/creators/index.ts`:

```typescript
export { AdminCreatorPanel } from './components/AdminCreatorPanel'
export { InviteButton } from './components/InviteButton'
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run
```

Expected: ~118 passed (104 baseline + 10 from Task 3 + 4 from Task 4)

- [ ] **Step 8: Commit**

```bash
git add src/modules/creators/ src/app/admin/creators/ src/app/admin/layout.tsx
git commit -m "feat: admin creator management page with invite generation UI"
```

---

## Chunk 3: Creator Onboarding

### Task 6: Creator invite acceptance page

**Files:**
- Create: `src/app/creators/onboarding/page.tsx`

This page validates the `?token=` param, requires the user to be signed in, creates their `CreatorProfile`, marks the token used, and redirects to the profile step.

- [ ] **Step 1: Create the page**

Create `src/app/creators/onboarding/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { validateInvite } from '@/modules/creators/lib/invites'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function CreatorOnboardingPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 400, textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            Invalid Invite
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            This invite link is missing or invalid. Contact the Ride MTB team for a new invite.
          </p>
        </div>
      </div>
    )
  }

  const inviteRecord = await validateInvite(token)
  if (!inviteRecord) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 400, textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            Invite Expired or Used
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            This invite link has expired or has already been used. Contact the Ride MTB team for a new invite.
          </p>
        </div>
      </div>
    )
  }

  const user = await requireAuth()

  // Idempotent: if profile already exists, skip to next step
  const existing = await db.creatorProfile.findUnique({ where: { userId: user.id } })
  if (existing) {
    redirect('/creators/onboarding/profile')
  }

  // Mark token used + create creator profile atomically
  await db.$transaction([
    db.inviteToken.update({
      where: { id: inviteRecord.id },
      data: { used: true, claimedByUserId: user.id },
    }),
    db.creatorProfile.create({
      data: {
        userId: user.id,
        displayName: user.name ?? user.email?.split('@')[0] ?? 'Creator',
        status: 'onboarding',
      },
    }),
  ])

  redirect('/creators/onboarding/profile')
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: 104 passed

- [ ] **Step 3: Commit**

```bash
git add src/app/creators/onboarding/page.tsx
git commit -m "feat: creator invite acceptance page — validates token, creates profile"
```

---

### Task 7: saveCreatorProfile server action (TDD)

**Files:**
- Create: `src/modules/creators/actions/saveCreatorProfile.ts`
- Create: `src/modules/creators/actions/saveCreatorProfile.test.ts`

Collects `displayName` (required), `bio` (optional), `youtubeChannelUrl` (optional), and the content licensing attestation checkbox (required).

- [ ] **Step 1: Write the failing test**

Create `src/modules/creators/actions/saveCreatorProfile.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

vi.mock('@/lib/auth/guards', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { saveCreatorProfile } from './saveCreatorProfile'

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData()
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v))
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ id: 'user-123' } as any)
  vi.mocked(db.creatorProfile.findUnique).mockResolvedValue({
    id: 'profile-1', userId: 'user-123', displayName: 'Old Name', status: 'onboarding',
  } as any)
  vi.mocked(db.creatorProfile.update).mockResolvedValue({} as any)
})

describe('saveCreatorProfile', () => {
  it('saves displayName and returns success', async () => {
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner', licensingAttested: 'true' }),
    )
    expect(result.success).toBe(true)
    expect(db.creatorProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
        data: expect.objectContaining({ displayName: 'Kyle Warner' }),
      })
    )
  })

  it('sets licensingAttestedAt when attestation checkbox is checked', async () => {
    await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner', licensingAttested: 'true' }),
    )
    const call = vi.mocked(db.creatorProfile.update).mock.calls[0][0]
    expect(call.data.licensingAttestedAt).toBeInstanceOf(Date)
  })

  it('returns error when displayName is missing', async () => {
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ licensingAttested: 'true' }),
    )
    expect(result.errors.displayName).toBeDefined()
    expect(db.creatorProfile.update).not.toHaveBeenCalled()
  })

  it('returns error when displayName is too short', async () => {
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'A', licensingAttested: 'true' }),
    )
    expect(result.errors.displayName).toBeDefined()
  })

  it('returns error when licensing attestation is not checked', async () => {
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner' }),
    )
    expect(result.errors.licensingAttested).toBeDefined()
    expect(db.creatorProfile.update).not.toHaveBeenCalled()
  })

  it('saves optional bio when provided', async () => {
    await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner', bio: 'I ride trails', licensingAttested: 'true' }),
    )
    const call = vi.mocked(db.creatorProfile.update).mock.calls[0][0]
    expect(call.data.bio).toBe('I ride trails')
  })

  it('returns error when creator profile not found', async () => {
    vi.mocked(db.creatorProfile.findUnique).mockResolvedValueOnce(null)
    const result = await saveCreatorProfile(
      { errors: {} },
      makeFormData({ displayName: 'Kyle Warner', licensingAttested: 'true' }),
    )
    expect(result.errors.general).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/modules/creators/actions/saveCreatorProfile.test.ts
```

Expected: FAIL — "Cannot find module './saveCreatorProfile'"

- [ ] **Step 3: Implement saveCreatorProfile.ts**

Create `src/modules/creators/actions/saveCreatorProfile.ts`:

```typescript
'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

export type SaveCreatorProfileState = {
  errors: Record<string, string>
  success?: boolean
}

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be at most 50 characters'),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  youtubeChannelUrl: z.string().max(200).optional(),
  licensingAttested: z.literal('true', {
    errorMap: () => ({ message: 'You must agree to the content licensing terms to continue.' }),
  }),
})

export async function saveCreatorProfile(
  _prevState: SaveCreatorProfileState,
  formData: FormData,
): Promise<SaveCreatorProfileState> {
  try {
    const user = await requireAuth()

    const profile = await db.creatorProfile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      return { errors: { general: 'Creator profile not found. Please use your invite link again.' } }
    }

    const raw = {
      displayName: formData.get('displayName') as string | null,
      bio: (formData.get('bio') as string | null) ?? undefined,
      youtubeChannelUrl: (formData.get('youtubeChannelUrl') as string | null) ?? undefined,
      licensingAttested: formData.get('licensingAttested') as string | null,
    }

    const parsed = profileSchema.safeParse(raw)
    if (!parsed.success) {
      const errors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString() ?? 'form'
        errors[field] = issue.message
      }
      return { errors }
    }

    const { displayName, bio, youtubeChannelUrl } = parsed.data

    await db.creatorProfile.update({
      where: { userId: user.id },
      data: {
        displayName,
        ...(bio !== undefined && { bio }),
        ...(youtubeChannelUrl && { youtubeChannelId: youtubeChannelUrl }),
        licensingAttestedAt: new Date(),
      },
    })

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/modules/creators/actions/saveCreatorProfile.test.ts
```

Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/modules/creators/actions/saveCreatorProfile.ts src/modules/creators/actions/saveCreatorProfile.test.ts
git commit -m "feat: saveCreatorProfile server action with licensing attestation (TDD)"
```

---

### Task 8: Creator profile setup page

**Files:**
- Create: `src/app/creators/onboarding/profile/page.tsx`

Client component. Uses `useActionState` + `saveCreatorProfile`. On success, redirects to `/creators/onboarding/stripe`.

- [ ] **Step 1: Create the page**

Create `src/app/creators/onboarding/profile/page.tsx`:

```typescript
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveCreatorProfile,
  type SaveCreatorProfileState,
} from '@/modules/creators/actions/saveCreatorProfile'

export default function CreatorProfilePage() {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveCreatorProfileState, FormData>(
    saveCreatorProfile,
    { errors: {} },
  )

  useEffect(() => {
    if (state.success) router.push('/creators/onboarding/stripe')
  }, [state.success, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Step 1 of 2
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            Set up your creator profile
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            This is what viewers will see on your creator page.
          </p>
        </div>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="displayName" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '0.375rem' }}>
              Display Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              placeholder="e.g. Kyle Warner MTB"
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: `1px solid ${state.errors.displayName ? 'red' : 'var(--color-border)'}`, borderRadius: 8, background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
            {state.errors.displayName && (
              <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.25rem' }}>{state.errors.displayName}</p>
            )}
          </div>

          <div>
            <label htmlFor="bio" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '0.375rem' }}>
              Bio <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Tell viewers about yourself and your riding..."
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label htmlFor="youtubeChannelUrl" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '0.375rem' }}>
              YouTube Channel URL <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>(optional)</span>
            </label>
            <input
              id="youtubeChannelUrl"
              name="youtubeChannelUrl"
              type="url"
              placeholder="https://youtube.com/@yourchannel"
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 8, padding: '1rem' }}>
            <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="licensingAttested"
                value="true"
                required
                style={{ marginTop: '0.2rem', flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                I confirm that I own all rights to the content I will submit, and I authorize Ride MTB
                to host, stream, and monetize it on the platform.
              </span>
            </label>
            {state.errors.licensingAttested && (
              <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem' }}>{state.errors.licensingAttested}</p>
            )}
          </div>

          {state.errors.general && (
            <p style={{ color: 'red', fontSize: '0.85rem' }}>{state.errors.general}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.95rem', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1 }}
          >
            {isPending ? 'Saving...' : 'Continue to Stripe Setup →'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: 104 passed

- [ ] **Step 3: Commit**

```bash
git add src/app/creators/onboarding/profile/page.tsx
git commit -m "feat: creator profile setup page with licensing attestation form"
```

---

## Chunk 4: Stripe Connect + Creator Dashboard

### Task 9: Stripe Connect integration

**Files:**
- Create: `src/modules/creators/lib/stripe.ts`
- Create: `src/app/api/creators/stripe-connect/route.ts`
- Create: `src/app/creators/onboarding/stripe/page.tsx`
- Create: `src/app/creators/onboarding/complete/page.tsx`

Flow: creator hits `/creators/onboarding/stripe` → button links to `/api/creators/stripe-connect` → API route creates a Stripe Express account (if needed), stores `stripeAccountId`, creates an Account Link, redirects creator to Stripe hosted KYC → on return, creator lands on `/creators/onboarding/complete`.

- [ ] **Step 1: Create stripe.ts helper**

Create `src/modules/creators/lib/stripe.ts`:

```typescript
import 'server-only'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

export async function createStripeExpressAccount(): Promise<string> {
  const stripe = getStripe()
  const account = await stripe.accounts.create({ type: 'express' })
  return account.id
}

export async function createStripeOnboardingLink(
  stripeAccountId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<string> {
  const stripe = getStripe()
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding',
  })
  return link.url
}

export async function constructStripeEvent(body: string, signature: string) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  return stripe.webhooks.constructEvent(body, signature, secret)
}
```

- [ ] **Step 2: Create the Stripe Connect API route**

Create `src/app/api/creators/stripe-connect/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import {
  createStripeExpressAccount,
  createStripeOnboardingLink,
} from '@/modules/creators/lib/stripe'

export async function GET() {
  const session = await auth()
  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000'

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/signin', baseUrl))
  }

  const profile = await db.creatorProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) {
    return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })
  }

  try {
    let stripeAccountId = profile.stripeAccountId
    if (!stripeAccountId) {
      stripeAccountId = await createStripeExpressAccount()
      await db.creatorProfile.update({
        where: { id: profile.id },
        data: { stripeAccountId },
      })
    }

    const returnUrl = `${baseUrl}/creators/onboarding/complete`
    const refreshUrl = `${baseUrl}/api/creators/stripe-connect`
    const onboardingUrl = await createStripeOnboardingLink(stripeAccountId, returnUrl, refreshUrl)
    return NextResponse.redirect(onboardingUrl)
  } catch (err) {
    console.error('Stripe Connect error:', err)
    return NextResponse.redirect(`${baseUrl}/creators/onboarding/stripe?error=stripe_unavailable`)
  }
}
```

- [ ] **Step 3: Create the Stripe onboarding page (step 2 of 2)**

Create `src/app/creators/onboarding/stripe/page.tsx`:

```typescript
interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function CreatorStripePage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Step 2 of 2
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem' }}>
            Connect your Stripe account
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Ride MTB uses Stripe to send creator payouts. You&apos;ll be redirected to Stripe to
            verify your identity and add your bank account.
          </p>
        </div>

        {error === 'stripe_unavailable' && (
          <p style={{ color: 'red', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Stripe is temporarily unavailable. Please try again in a moment.
          </p>
        )}

        <a
          href="/api/creators/stripe-connect"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}
        >
          Continue to Stripe →
        </a>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          You&apos;ll need your government ID and bank account details.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create the onboarding complete page**

Create `src/app/creators/onboarding/complete/page.tsx`:

```typescript
import Link from 'next/link'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export default async function CreatorOnboardingCompletePage() {
  const user = await requireAuth()

  const profile = await db.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { status: true, displayName: true },
  })

  const isActive = profile?.status === 'active'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem' }}>
          {isActive ? "You're live!" : 'Application submitted!'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {isActive
            ? `Welcome to the Ride MTB creator program, ${profile?.displayName}. Head to your creator dashboard to get started.`
            : "Your Stripe details have been submitted. We'll activate your creator account once Stripe completes verification (usually within a few hours)."}
        </p>
        {isActive ? (
          <Link
            href="/dashboard/creator"
            style={{ display: 'inline-flex', padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}
          >
            Go to Creator Dashboard →
          </Link>
        ) : (
          <Link
            href="/dashboard"
            style={{ display: 'inline-flex', padding: '0.75rem 1.5rem', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}
          >
            Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: 104 passed

- [ ] **Step 6: Commit**

```bash
git add src/modules/creators/lib/stripe.ts src/app/api/creators/ src/app/creators/onboarding/stripe/ src/app/creators/onboarding/complete/
git commit -m "feat: Stripe Connect onboarding — API route, step pages, account links flow"
```

---

### Task 10: Stripe webhook handler (TDD)

**Files:**
- Create: `src/app/api/stripe/webhook/route.ts`
- Create: `src/app/api/stripe/webhook/route.test.ts`

Handles `account.updated`: when `details_submitted && charges_enabled`, activates the creator's profile.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/stripe/webhook/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  db: {
    creatorProfile: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/modules/creators/lib/stripe', () => ({
  constructStripeEvent: vi.fn(),
}))

import { db } from '@/lib/db/client'
import { constructStripeEvent } from '@/modules/creators/lib/stripe'
import { POST } from './route'

function makeWebhookRequest(body: string) {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': 'test-sig', 'content-type': 'application/json' },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/stripe/webhook', () => {
  it('returns 400 when stripe signature verification fails', async () => {
    vi.mocked(constructStripeEvent).mockImplementationOnce(() => {
      throw new Error('Invalid signature')
    })
    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(400)
  })

  it('activates creator when account.updated has details_submitted and charges_enabled', async () => {
    const mockEvent = {
      type: 'account.updated',
      data: { object: { id: 'acct_123', details_submitted: true, charges_enabled: true } },
    }
    vi.mocked(constructStripeEvent).mockReturnValueOnce(mockEvent as any)
    vi.mocked(db.creatorProfile.findFirst).mockResolvedValueOnce({
      id: 'profile-1', stripeAccountId: 'acct_123',
    } as any)
    vi.mocked(db.creatorProfile.update).mockResolvedValueOnce({} as any)

    const res = await POST(makeWebhookRequest(JSON.stringify(mockEvent)))
    expect(res.status).toBe(200)
    expect(db.creatorProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { status: 'active' },
    })
  })

  it('does not activate creator when details_submitted is false', async () => {
    const mockEvent = {
      type: 'account.updated',
      data: { object: { id: 'acct_123', details_submitted: false, charges_enabled: false } },
    }
    vi.mocked(constructStripeEvent).mockReturnValueOnce(mockEvent as any)

    const res = await POST(makeWebhookRequest(JSON.stringify(mockEvent)))
    expect(res.status).toBe(200)
    expect(db.creatorProfile.update).not.toHaveBeenCalled()
  })

  it('returns 200 for unhandled event types (no-op)', async () => {
    const mockEvent = { type: 'payment_intent.created', data: { object: {} } }
    vi.mocked(constructStripeEvent).mockReturnValueOnce(mockEvent as any)

    const res = await POST(makeWebhookRequest(JSON.stringify(mockEvent)))
    expect(res.status).toBe(200)
    expect(db.creatorProfile.update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/api/stripe/webhook/route.test.ts
```

Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Implement the webhook handler**

Create `src/app/api/stripe/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { constructStripeEvent } from '@/modules/creators/lib/stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Awaited<ReturnType<typeof constructStripeEvent>>
  try {
    event = await constructStripeEvent(body, signature)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object as {
        id: string
        details_submitted: boolean
        charges_enabled: boolean
      }
      if (account.details_submitted && account.charges_enabled) {
        const profile = await db.creatorProfile.findFirst({
          where: { stripeAccountId: account.id },
        })
        if (profile) {
          await db.creatorProfile.update({
            where: { id: profile.id },
            data: { status: 'active' },
          })
        }
      }
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/api/stripe/webhook/route.test.ts
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stripe/webhook/
git commit -m "feat: Stripe webhook — account.updated activates creator profile (TDD)"
```

---

### Task 11: Creator dashboard

**Files:**
- Create: `src/modules/creators/components/CreatorDashboard.tsx`
- Create: `src/app/dashboard/creator/page.tsx`
- Modify: `src/modules/creators/index.ts`

4-tab dashboard. Videos / Analytics / Wallet show empty states — these fill in during Phase 2. Settings shows profile info and Stripe status.

- [ ] **Step 1: Create CreatorDashboard.tsx (client component)**

Create `src/modules/creators/components/CreatorDashboard.tsx`:

```typescript
'use client'

import { useState } from 'react'

type Tab = 'videos' | 'analytics' | 'wallet' | 'settings'

interface CreatorDashboardProps {
  displayName: string
  status: string
  stripeConnected: boolean
}

export function CreatorDashboard({ displayName, status, stripeConnected }: CreatorDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('videos')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'videos', label: 'Videos' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      {status !== 'active' && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-700">
            Your creator account is pending activation.
            {!stripeConnected && (
              <> <a href="/creators/onboarding/stripe" className="underline">Complete your Stripe setup</a> to go live.</>
            )}
            {stripeConnected && ' Stripe has your details — activation usually takes a few hours.'}
          </p>
        </div>
      )}

      <div className="mb-6 border-b border-[var(--color-border)]">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'videos' && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-3 text-4xl">🎬</p>
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">No videos yet</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Video ingestion ships in Phase 2. Once live, your YouTube videos will appear here automatically.
          </p>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-3 text-4xl">📊</p>
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Analytics coming soon</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Views, earnings, and top videos will appear here once your content is live.
          </p>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-3 text-4xl">💰</p>
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">$0.00 available</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Earnings from pre-roll ads will appear here. Minimum payout is $50.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Display Name</p>
            <p className="mt-1 text-sm text-[var(--color-text)]">{displayName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Stripe Status</p>
            <p className="mt-1 text-sm">
              {stripeConnected
                ? <span className="text-green-600">Connected</span>
                : <a href="/creators/onboarding/stripe" className="text-[var(--color-primary)] underline">Connect Stripe account</a>}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Account Status</p>
            <p className="mt-1 text-sm capitalize text-[var(--color-text)]">{status}</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the creator dashboard page**

Create `src/app/dashboard/creator/page.tsx`:

```typescript
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getCreatorByUserId } from '@/modules/creators/lib/queries'
import { CreatorDashboard } from '@/modules/creators/components/CreatorDashboard'

export const metadata: Metadata = {
  title: 'Creator Dashboard | Ride MTB',
}

export default async function CreatorDashboardPage() {
  const user = await requireAuth()

  const profile = await getCreatorByUserId(user.id)
  if (!profile) redirect('/creators/onboarding')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Creator Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Welcome back, {profile.displayName}</p>
      </div>
      <CreatorDashboard
        displayName={profile.displayName}
        status={profile.status}
        stripeConnected={!!profile.stripeAccountId}
      />
    </div>
  )
}
```

- [ ] **Step 3: Update barrel exports**

In `src/modules/creators/index.ts`, add:

```typescript
export { CreatorDashboard } from './components/CreatorDashboard'
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/modules/creators/components/CreatorDashboard.tsx src/app/dashboard/creator/ src/modules/creators/index.ts
git commit -m "feat: creator dashboard with 4 tabs and Phase 2 empty states"
```

---

### Task 12: Full verification

**Files:** None — verification only.

- [ ] **Step 1: Run full test suite with verbose output**

```bash
npx vitest run --reporter=verbose
```

Expected: all tests pass (104 original + ~20 new = ~124 total). Count the total and confirm no failures.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If there are type errors, fix them before proceeding.

- [ ] **Step 3: Build check**

```bash
npx next build --turbopack 2>&1 | tail -10
```

Expected: "Compiled successfully" or "Route ... kB" output. No build errors.

- [ ] **Step 4: Smoke test key routes in browser**

With dev server running (`npm run dev`):

| URL | Expected |
|-----|----------|
| `http://localhost:3000/admin/creators` | Admin-only "Creator Management" page with "Creators" in nav |
| `http://localhost:3000/creators/onboarding` | "Invalid Invite" message (no token) |
| `http://localhost:3000/creators/onboarding?token=fakeinvalidtoken` | "Invite Expired or Used" message |
| `http://localhost:3000/creators/onboarding/profile` | Profile form (requires auth — redirects to /signin if not signed in) |
| `http://localhost:3000/creators/onboarding/stripe` | "Step 2 of 2 — Connect your Stripe account" |
| `http://localhost:3000/dashboard/creator` | Redirects to `/creators/onboarding` (no profile for test user) |

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: creator video pipeline Phase 1 complete — onboarding framework"
```
