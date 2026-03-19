# Profile Avatar Upload with AI Moderation — Design Spec

**Goal:** Allow users to upload a custom profile photo with browser-side cropping and server-side AI content moderation before saving.

**Architecture:** Upload → Google Vision SafeSearch → Supabase Storage. Rejected photos never reach the CDN. Accepted photos overwrite the previous avatar in place.

**Tech Stack:** Next.js App Router API route, `@google-cloud/vision`, Supabase Storage, `react-image-crop`

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
        ProfileForm.tsx     # Add clickable avatar + upload trigger (modify)
```

---

## API Route: `POST /api/profile/avatar`

**Auth:** Requires active session — returns 401 if unauthenticated.

**Request:** `multipart/form-data` with a single field `file` containing the cropped image blob.

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
- Uploads to Supabase Storage bucket `ridemtb-assets`, path `avatars/{userId}.jpg`
- 1-year cache-control header (existing storage config)
- Overwrites any previous upload — no orphaned files
- Updates `user.avatarUrl` in the database
- Returns `{ avatarUrl: string }`

**Error responses:**

| Status | Cause |
|--------|-------|
| 400 | Invalid file type or file too large |
| 401 | Not authenticated |
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

**Auth:** Uses `GOOGLE_APPLICATION_CREDENTIALS` env var (path to service account JSON) or `GOOGLE_VISION_API_KEY`. Same Google Cloud project as OAuth is fine.

**Threshold:** `LIKELY` or `VERY_LIKELY` on `adult` or `violence` → fail. Everything else → pass.

---

## Browser Crop UI (`AvatarUpload.tsx`)

A modal component triggered by clicking the avatar in ProfileForm.

**Flow:**
1. User clicks avatar → file picker opens (accept: `image/*`)
2. Selected image loads into `react-image-crop` with a locked circular aspect ratio (1:1)
3. User drags/resizes the crop selection
4. "Upload" button → canvas renders the crop → sends as blob to `POST /api/profile/avatar`
5. Loading spinner while uploading
6. On success: modal closes, ProfileForm shows new avatar immediately (optimistic URL)
7. On 422: inline error — "Photo didn't pass our content guidelines. Please choose a different image."
8. On other error: "Upload failed. Please try again."

**No form submission required** — upload happens immediately on click, independent of the rest of the ProfileForm save.

---

## ProfileForm Changes

- Clickable avatar area replaces the static display at the top of the form
- Clicking opens `<AvatarUpload>` modal
- On successful upload, `avatarUrl` state updates so the new photo renders without a page reload
- A small camera/edit icon overlays the avatar on hover to indicate it's clickable

---

## Environment Variables

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OR
GOOGLE_VISION_API_KEY=...
```

Add to `.env.local` (local) and Vercel environment variables (production).

---

## Out of Scope

- Cover/banner photo upload (`coverUrl` field exists but not wired)
- Admin moderation queue / manual review
- GIF or video avatars
- Multiple photo slots
