# Profile Avatar Upload with AI Moderation — Design Spec

**Goal:** Allow users to upload a custom profile photo with browser-side cropping and server-side AI content moderation before saving.

**Architecture:** Upload → Google Vision SafeSearch → Supabase Storage. Rejected photos never reach the CDN. Accepted photos overwrite the previous avatar in place.

**Tech Stack:** Next.js App Router API route, `@google-cloud/vision`, Supabase Storage, `react-image-crop`

---

## Dependencies

New packages to install:
- `react-image-crop` — browser crop UI
- `@google-cloud/vision` — SafeSearch moderation API

---

## Data Model

No schema changes required. The `User` model already has:

```prisma
avatarUrl  String?   // stores the Supabase CDN URL after upload
image      String?   // Google OAuth photo — used as fallback
```

The `Avatar` component already reads `user.avatarUrl || user.image`, so new uploads slot in automatically.

---

## File Structure

```
src/
  app/
    api/
      profile/
        avatar/
          route.ts          # POST — upload, moderate, save
  lib/
    vision/
      moderation.ts         # Google Vision SafeSearch wrapper
  modules/
    profile/
      components/
        AvatarUpload.tsx    # Crop modal (new)
        ProfileForm.tsx     # Add avatar section at top (modify)
```

---

## API Route: `POST /api/profile/avatar`

**Auth:** Requires active session — returns 401 if unauthenticated.

**Request:** `multipart/form-data` with a single field `file` containing the cropped image blob.

**Rate limiting:** Use the existing `src/lib/rate-limit.ts` utility (same pattern as `src/app/api/marketplace/images/route.ts`) — limit to 10 uploads per minute per user. This protects against Vision API cost abuse.

**Validation (before moderation):**
- File size: max 5 MB
- MIME type: `image/jpeg`, `image/png`, `image/webp` only
- Returns 400 on violation

**Moderation:**
- Calls Google Vision SafeSearch Detection API
- Blocks if `adult` or `violence` annotation is `LIKELY` or `VERY_LIKELY`
- Returns 422 with message `"Photo didn't pass our content guidelines"` on block
- All other categories (racy, medical, spoof) are allowed

**On pass:**
- Convert the received `FormData` file to an `ArrayBuffer` / `Uint8Array` and upload via the Supabase storage client directly (not via the `uploadFile` wrapper in `src/lib/supabase/storage.ts` — that helper expects a `File` object, not a `Buffer`)
- Storage path: `avatars/{userId}.jpg` — the canvas output from `AvatarUpload` is always encoded as JPEG (see Browser Crop UI below), so `.jpg` is always correct
- Content-Type: `image/jpeg`; 1-year cache-control (matching existing storage config)
- Overwrites any previous upload — no orphaned files
- Updates `user.avatarUrl` in the database
- Returns `{ avatarUrl: string }`

**Error responses:**

| Status | Cause |
|--------|-------|
| 400 | Invalid file type or file too large |
| 401 | Not authenticated |
| 429 | Rate limit exceeded |
| 422 | Failed AI moderation |
| 500 | Upload or Vision API failure |

---

## Google Vision Moderation (`src/lib/vision/moderation.ts`)

Thin wrapper around `@google-cloud/vision` `ImageAnnotatorClient`.

```ts
export type ModerationResult =
  | { pass: true }
  | { pass: false; reason: string }

export async function checkImageSafety(buffer: Buffer): Promise<ModerationResult>
```

**Auth on Vercel:** `GOOGLE_APPLICATION_CREDENTIALS` (file path) does not work on Vercel's serverless environment — there is no persistent filesystem. Use individual env vars instead and instantiate the client programmatically:

```ts
const client = new ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})
```

**Threshold:** `LIKELY` or `VERY_LIKELY` on `adult` or `violence` → fail. Everything else → pass.

---

## Browser Crop UI (`AvatarUpload.tsx`)

A client component modal triggered from ProfileForm.

**Canvas output is always JPEG:** Call `canvas.toBlob(callback, 'image/jpeg', 0.9)` to produce the upload blob. This ensures the storage path `avatars/{userId}.jpg` is always correct regardless of the original file type selected.

**Flow:**
1. User clicks the avatar section in ProfileForm → file picker opens (`accept="image/*"`)
2. Selected image loads into `react-image-crop` with a locked 1:1 aspect ratio (circular display via CSS)
3. User drags/resizes the crop selection
4. "Upload" button → canvas renders the crop as JPEG → sends as blob to `POST /api/profile/avatar`
5. Loading spinner while uploading
6. On success: modal closes, AvatarUpload calls `router.refresh()` to re-fetch the server component tree (this updates ProfileHeader and any other displays of the avatar without a full page reload)
7. On 422: inline error — "Photo didn't pass our content guidelines. Please choose a different image."
8. On other error: "Upload failed. Please try again."

**State:** `AvatarUpload` owns its own `useState` for the crop, loading, and error states. No state flows back to ProfileForm — `router.refresh()` handles syncing the displayed avatar.

**Upload is independent of ProfileForm save** — clicking Upload in the modal immediately persists the photo to the DB. The user does not need to click "Save Profile" to keep the new avatar.

---

## ProfileForm Changes

`ProfileForm.tsx` (`src/app/profile/settings/page.tsx` renders the settings form) currently has no avatar display. Add a dedicated avatar section at the top of the form:

```
┌──────────────────────────────────┐
│  [Avatar circle]  ← click to     │
│  [KW or photo ]     open crop    │
│                     modal        │
│  Display Name  _________________ │
│  Username      _________________ │
│  ...                             │
└──────────────────────────────────┘
```

- The avatar renders with a small camera icon overlay on hover
- Clicking it mounts `<AvatarUpload userId={user.id} currentAvatarUrl={user.avatarUrl} />`
- No other changes to ProfileForm's existing save flow

---

## Environment Variables

Add to `.env.local` (local) and Vercel environment variables (production):

```
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Note: `GOOGLE_PRIVATE_KEY` must preserve literal `\n` characters — wrap in quotes in `.env.local` and use `.replace(/\\n/g, '\n')` when reading it in code. In Vercel dashboard, paste the raw multi-line key directly (Vercel handles newlines natively).

The existing `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` vars (already present for the marketplace rate limiter) are reused — no new Redis setup needed.

---

## Out of Scope

- Cover/banner photo upload (`coverUrl` field exists but not wired)
- Admin moderation queue / manual review
- GIF or video avatars
- Multiple photo slots
