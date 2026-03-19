# Profile Avatar Upload with AI Moderation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload a cropped profile photo that passes Google Vision SafeSearch moderation before being saved to Supabase Storage and shown on leaderboards/forums.

**Architecture:** Browser crop UI → `POST /api/profile/avatar` → Google Vision SafeSearch → Supabase Storage (`avatars/{userId}.jpg`) → update `user.avatarUrl` in DB → `router.refresh()` syncs all avatar displays. Rejected photos return 422 and never reach the CDN.

**Tech Stack:** Next.js 15 App Router, `react-image-crop`, `@google-cloud/vision`, Supabase Storage (existing), Upstash Redis rate-limit (existing), Prisma v7 (existing), Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/ui/components/Avatar.tsx` | Modify | Add `xl` size (80px) needed by the upload trigger |
| `src/lib/vision/moderation.ts` | Create | Google Vision SafeSearch wrapper |
| `src/lib/vision/moderation.test.ts` | Create | Unit tests for moderation wrapper |
| `src/app/api/profile/avatar/route.ts` | Create | Upload API route (auth, rate-limit, validate, moderate, save) |
| `src/modules/profile/components/AvatarUpload.tsx` | Create | Browser crop modal component |
| `src/modules/profile/components/ProfileForm.tsx` | Modify | Add avatar section at top of form |
| `next.config.ts` | Modify | Add `@google-cloud/vision` to `serverExternalPackages` |

---

## Task 1: Install Dependencies and Configure Bundler

**Files:**
- Modify: `package.json` (via npm)
- Modify: `next.config.ts`

- [ ] **Step 1: Install packages**

```bash
npm install react-image-crop @google-cloud/vision
```

- [ ] **Step 2: Add `@google-cloud/vision` to serverExternalPackages**

`@google-cloud/vision` uses gRPC and native bindings that cannot be bundled by Webpack or Turbopack. It must be excluded from bundling.

Open `next.config.ts` and update the `serverExternalPackages` array on line 57:

```ts
serverExternalPackages: ['@react-pdf/renderer', '@google-cloud/vision'],
```

- [ ] **Step 3: Verify build config**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "deps: add react-image-crop, @google-cloud/vision; exclude vision from bundler"
```

---

## Task 2: Extend Avatar Component with `xl` Size

**Files:**
- Modify: `src/ui/components/Avatar.tsx`

The current `Avatar` component supports `sm` (32px), `md` (40px), `lg` (56px). The upload trigger needs 80px. Add `xl`.

- [ ] **Step 1: Update Avatar.tsx**

The full updated file (lines 1–41):

```tsx
import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizePx = { sm: 32, md: 40, lg: 56, xl: 80 }

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-2xl',
}

export function Avatar({ src, alt = 'User', size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={sizePx[size]}
        height={sizePx[size]}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    )
  }

  const initials = alt.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] font-medium text-white ${sizeClasses[size]} ${className}`}
      aria-label={alt}
    >
      {initials}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep Avatar
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/Avatar.tsx
git commit -m "feat: add xl size (80px) to Avatar component"
```

---

## Task 3: Google Vision Moderation Wrapper

**Files:**
- Create: `src/lib/vision/moderation.ts`
- Create: `src/lib/vision/moderation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/vision/moderation.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock server-only FIRST — it throws at import time outside Next.js runtime
vi.mock('server-only', () => ({}))

// Mock @google-cloud/vision before importing the module under test
vi.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: vi.fn().mockImplementation(() => ({
    safeSearchDetection: vi.fn(),
  })),
}))

import { ImageAnnotatorClient } from '@google-cloud/vision'
import { checkImageSafety } from './moderation'

const mockClient = { safeSearchDetection: vi.fn() }

beforeEach(() => {
  vi.mocked(ImageAnnotatorClient).mockImplementation(() => mockClient as any)
})

describe('checkImageSafety', () => {
  const buffer = Buffer.from('fake-image-data')

  it('returns pass:true when SafeSearch finds no issues', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: {
        adult: 'VERY_UNLIKELY',
        violence: 'VERY_UNLIKELY',
        racy: 'POSSIBLE',
        medical: 'UNLIKELY',
        spoof: 'VERY_UNLIKELY',
      },
    }])
    const result = await checkImageSafety(buffer)
    expect(result).toEqual({ pass: true })
  })

  it('returns pass:false when adult is LIKELY', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: { adult: 'LIKELY', violence: 'VERY_UNLIKELY' },
    }])
    const result = await checkImageSafety(buffer)
    expect(result.pass).toBe(false)
  })

  it('returns pass:false when adult is VERY_LIKELY', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: { adult: 'VERY_LIKELY', violence: 'UNLIKELY' },
    }])
    const result = await checkImageSafety(buffer)
    expect(result.pass).toBe(false)
  })

  it('returns pass:false when violence is LIKELY', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: { adult: 'VERY_UNLIKELY', violence: 'LIKELY' },
    }])
    const result = await checkImageSafety(buffer)
    expect(result.pass).toBe(false)
  })

  it('returns pass:true when adult is POSSIBLE (below threshold)', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{
      safeSearchAnnotation: { adult: 'POSSIBLE', violence: 'UNLIKELY' },
    }])
    const result = await checkImageSafety(buffer)
    expect(result).toEqual({ pass: true })
  })

  it('returns pass:true when SafeSearch returns no annotation', async () => {
    mockClient.safeSearchDetection.mockResolvedValue([{ safeSearchAnnotation: null }])
    const result = await checkImageSafety(buffer)
    expect(result).toEqual({ pass: true })
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx vitest run src/lib/vision/moderation.test.ts
```

Expected: FAIL — "Cannot find module './moderation'"

- [ ] **Step 3: Create the moderation wrapper**

Create `src/lib/vision/moderation.ts`:

```ts
import 'server-only'
import { ImageAnnotatorClient } from '@google-cloud/vision'

export type ModerationResult = { pass: true } | { pass: false; reason: string }

const BLOCKED_CATEGORIES = ['adult', 'violence'] as const
const BLOCKED_LIKELIHOODS = new Set(['LIKELY', 'VERY_LIKELY'])

function makeClient(): ImageAnnotatorClient {
  return new ImageAnnotatorClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  })
}

export async function checkImageSafety(buffer: Buffer): Promise<ModerationResult> {
  const client = makeClient()
  const [result] = await client.safeSearchDetection({ image: { content: buffer } })
  const safe = result.safeSearchAnnotation

  if (!safe) return { pass: true }

  for (const category of BLOCKED_CATEGORIES) {
    const likelihood = safe[category] as string | undefined
    if (likelihood && BLOCKED_LIKELIHOODS.has(likelihood)) {
      return { pass: false, reason: `Content flagged as ${category}` }
    }
  }

  return { pass: true }
}
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
npx vitest run src/lib/vision/moderation.test.ts
```

Expected: 6 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vision/moderation.ts src/lib/vision/moderation.test.ts
git commit -m "feat: add Google Vision SafeSearch moderation wrapper"
```

---

## Task 4: Avatar Upload API Route

**Files:**
- Create: `src/app/api/profile/avatar/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/profile/avatar/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { rateLimit } from '@/lib/rate-limit'
import { checkImageSafety } from '@/lib/vision/moderation'
import { BUCKET, StorageFolders, getPublicUrl } from '@/lib/supabase/storage'
import { getSupabaseClient } from '@/lib/supabase/client'
import { db } from '@/lib/db/client'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await rateLimit({ userId: session.user.id, action: 'profile-avatar-upload', maxPerMinute: 10 })
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const moderation = await checkImageSafety(buffer)
  if (!moderation.pass) {
    return NextResponse.json(
      { error: "Photo didn't pass our content guidelines. Please choose a different image." },
      { status: 422 },
    )
  }

  // Upload directly via Supabase client (not uploadFile helper — that expects File, not Buffer)
  const filename = `${session.user.id}.jpg`
  const path = `${StorageFolders.avatars}/${filename}`

  const { error: uploadError } = await getSupabaseClient()
    .storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '31536000',
    })

  if (uploadError) {
    console.error('[avatar-upload] Supabase upload error:', uploadError.message)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  const avatarUrl = getPublicUrl(StorageFolders.avatars, filename)

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
  })

  return NextResponse.json({ avatarUrl })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "avatar/route"
```

Expected: no errors on this file.

- [ ] **Step 3: Smoke test with curl**

With the dev server running (`npx next dev`), get your session cookie from the browser (DevTools → Application → Cookies → `authjs.session-token`):

```bash
curl -X POST http://localhost:3000/api/profile/avatar \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -F "file=@/path/to/any-photo.jpg"
```

Expected (if Vision API credentials are configured): `{"avatarUrl":"https://...supabase.co/.../avatars/YOUR_USER_ID.jpg"}`

Expected (if Vision API not yet configured): `{"error":"Upload failed. Please try again."}` with status 500 — this is fine for now, the route structure is correct.

Expected (if not signed in): `{"error":"Unauthorized"}` with status 401.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/profile/avatar/route.ts
git commit -m "feat: add profile avatar upload API route with Vision moderation"
```

---

## Task 5: AvatarUpload Browser Component

**Files:**
- Create: `src/modules/profile/components/AvatarUpload.tsx`

- [ ] **Step 1: Create the component**

Create `src/modules/profile/components/AvatarUpload.tsx`:

```tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Camera, Loader2, X } from 'lucide-react'
import { Avatar } from '@/ui/components/Avatar'

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  currentImage: string | null
  displayName: string
}

export function AvatarUpload({ currentAvatarUrl, currentImage, displayName }: AvatarUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImgSrc(reader.result as string)
      setIsModalOpen(true)
      setError(null)
      setCrop(undefined)
    }
    reader.readAsDataURL(file)
    // Reset so the same file can be re-selected if needed
    e.target.value = ''
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height))
  }

  function getCroppedBlob(): Promise<Blob> {
    const image = imgRef.current
    if (!image || !crop) throw new Error('No crop selected')

    const canvas = document.createElement('canvas')
    const SIZE = 400
    canvas.width = SIZE
    canvas.height = SIZE

    const ctx = canvas.getContext('2d')!

    ctx.drawImage(
      image,
      (crop.x / 100) * image.naturalWidth,
      (crop.y / 100) * image.naturalHeight,
      (crop.width / 100) * image.naturalWidth,
      (crop.height / 100) * image.naturalHeight,
      0, 0, SIZE, SIZE,
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas produced no output'))),
        'image/jpeg',
        0.9,
      )
    })
  }

  async function handleUpload() {
    try {
      setIsUploading(true)
      setError(null)

      const blob = await getCroppedBlob()
      const formData = new FormData()
      formData.append('file', blob, 'avatar.jpg')

      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Upload failed. Please try again.')
        return
      }

      setIsModalOpen(false)
      router.refresh()
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      {/* Avatar trigger */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative"
          aria-label="Change profile photo"
        >
          <Avatar
            src={currentAvatarUrl ?? currentImage}
            alt={displayName}
            size="xl"
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-7 w-7 text-white" />
          </span>
        </button>
        <p className="text-xs text-[var(--color-text-muted)]">Click to change photo</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onSelectFile}
      />

      {/* Crop modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-[var(--color-bg)] p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
              Crop your photo
            </h2>

            <ReactCrop
              crop={crop}
              onChange={setCrop}
              aspect={1}
              circularCrop
              className="max-h-72 w-full overflow-hidden rounded-lg"
            >
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-72 w-full object-contain"
              />
            </ReactCrop>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !crop}
                className="inline-flex items-center gap-2 justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isUploading ? 'Uploading…' : 'Upload Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep AvatarUpload
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/profile/components/AvatarUpload.tsx
git commit -m "feat: add AvatarUpload crop modal component"
```

---

## Task 6: Wire AvatarUpload into ProfileForm

**Files:**
- Modify: `src/modules/profile/components/ProfileForm.tsx`

- [ ] **Step 1: Add import**

At the top of `src/modules/profile/components/ProfileForm.tsx`, after the existing imports (after line 7), add:

```ts
import { AvatarUpload } from './AvatarUpload'
```

- [ ] **Step 2: Add avatar section to form**

Insert this block immediately before `<div className="grid gap-6 sm:grid-cols-2">` (the first grid div, currently around line 32):

```tsx
      {/* Avatar upload — independent of form save */}
      <div className="flex justify-center pb-2">
        <AvatarUpload
          currentAvatarUrl={user.avatarUrl}
          currentImage={user.image}
          displayName={user.name ?? user.username ?? 'User'}
        />
      </div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "(ProfileForm|AvatarUpload)"
```

Expected: no errors.

- [ ] **Step 4: Manual end-to-end test**

1. Start dev server: `npx next dev`
2. Sign in, navigate to `/profile/settings`
3. Confirm an 80px avatar circle (or KW initials) appears at the top of the form with a camera icon on hover
4. Click the avatar — file picker opens
5. Select any photo — crop modal appears with circular crop overlay
6. Adjust crop, click "Upload Photo"
7. With Vision credentials configured: photo uploads, modal closes, avatar updates on the page
8. Navigate to `/profile` — confirm updated avatar in the header
9. Navigate to `/forum/leaderboard` — confirm updated avatar appears there too

- [ ] **Step 5: Commit**

```bash
git add src/modules/profile/components/ProfileForm.tsx
git commit -m "feat: add avatar upload to profile settings form"
```

---

## Task 7: Google Cloud Service Account Setup (Production)

This task is manual — no code to write.

- [ ] **Step 1: Create Google Cloud service account**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Use the same project as your Google OAuth (check existing `GOOGLE_CLIENT_ID` to identify the project)
3. IAM & Admin → Service Accounts → Create Service Account
4. Name: `ride-mtb-vision` → Continue
5. Role: "Cloud Vision API User" → Done
6. Click the new account → Keys tab → Add Key → JSON → Download

Open the JSON file and copy:
- `client_email` field
- `private_key` field (the full `-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----\n` string)

- [ ] **Step 2: Enable Vision API**

Google Cloud Console → APIs & Services → Library → search "Cloud Vision API" → Enable.

- [ ] **Step 3: Add env vars locally**

Add to `.env.local` (wrap the private key in double quotes):

```
GOOGLE_CLIENT_EMAIL=ride-mtb-vision@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

- [ ] **Step 4: Add env vars to Vercel**

```bash
vercel env add GOOGLE_CLIENT_EMAIL production preview development
# Paste the client_email value when prompted

vercel env add GOOGLE_PRIVATE_KEY production preview development
# Paste the full private key — Vercel handles newlines natively, no escaping needed
```

- [ ] **Step 5: Full end-to-end test with real credentials**

Restart dev server, repeat the upload flow from Task 6 Step 4 — this time the Vision API responds and the photo fully saves.

Test rejection: temporarily rename `GOOGLE_CLIENT_EMAIL` to something invalid to confirm Vision errors produce the correct 500 message in the UI. Restore after.
