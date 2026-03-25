# Marketplace MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing Marketplace stub into a fully functional buy/sell platform with image uploads, favorites, seller dashboard, messaging integration, and XP rewards.

**Architecture:** Build on the existing Listing model and module structure. Add ListingFavorite DB model, replace imageUrls textarea with Supabase Storage file upload, add favorites toggle API, seller dashboard page, Message Seller button wired to existing conversations system, and XP grants on key actions.

**Tech Stack:** Next.js 15, Prisma v7, Supabase Storage, NextAuth v5, Tailwind CSS v4, existing XP engine, existing conversations/messages system.

---

## Task 1: DB Schema — ListingFavorite + XP Events + Storage Folder

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/supabase/storage.ts`

- [ ] **Step 1: Add ListingFavorite model and update relations in schema.prisma**

Add after the Listing model's closing brace:

```prisma
model ListingFavorite {
  id        String   @id @default(cuid())
  userId    String
  listingId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@unique([userId, listingId])
  @@index([userId, createdAt])
  @@index([listingId])
  @@map("listing_favorites")
}
```

Add to the Listing model (before the closing `}`):
```prisma
  favorites    ListingFavorite[]
  _count       ListingFavorite[] is handled by Prisma relation count
```

Actually add this field to Listing:
```prisma
  favorites ListingFavorite[]
```

Add to User model (find `@@map("users")` and add before it):
```prisma
  listingFavorites ListingFavorite[]
```

Add to XpEvent enum:
```prisma
  listing_created
  listing_favorited
```

- [ ] **Step 2: Add marketplace folder to StorageFolders**

In `src/lib/supabase/storage.ts`, add to the StorageFolders object:
```typescript
  marketplace: 'marketplace',
```

- [ ] **Step 3: Generate and apply migration**

```bash
cd /Users/kylewarner/Documents/ride-mtb
npx prisma migrate dev --name add_listing_favorite
```

Expected: migration file created, `listing_favorites` table created in DB.

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `@/generated/prisma/client` updated with ListingFavorite model.

- [ ] **Step 5: Verify schema compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/ src/lib/supabase/storage.ts
git commit -m "feat(marketplace): add ListingFavorite model, XP events, storage folder"
```

---

## Task 2: Image Upload — Replace Textarea with Supabase Storage Uploader

**Files:**
- Create: `src/modules/marketplace/components/ImageUploader.tsx`
- Modify: `src/modules/marketplace/components/CreateListingForm.tsx`
- Modify: `src/modules/marketplace/actions/createListing.ts`
- Create: `src/app/api/marketplace/images/route.ts`

**Context:** Currently CreateListingForm has a textarea where users paste image URLs. Replace with a file input that uploads to Supabase Storage `marketplace` folder and stores the resulting public URLs. Support up to 8 images. Show thumbnails. First image is cover.

- [ ] **Step 1: Create the image upload API route**

Create `src/app/api/marketplace/images/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { uploadFile, StorageFolders } from '@/lib/supabase/storage'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ requests: 20, window: '1m' })

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = await limiter.limit(session.user.id)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${session.user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const url = await uploadFile(StorageFolders.marketplace, filename, file)
  return NextResponse.json({ url })
}
```

- [ ] **Step 2: Create ImageUploader component**

Create `src/modules/marketplace/components/ImageUploader.tsx`:

```tsx
'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, ImageIcon } from 'lucide-react'

interface ImageUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function ImageUploader({ value, onChange, maxImages = 8 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    const remaining = maxImages - value.length
    if (remaining <= 0) return

    setError(null)
    setUploading(true)

    const toUpload = Array.from(files).slice(0, remaining)
    const results: string[] = []

    for (const file of toUpload) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/marketplace/images', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Upload failed')
        break
      }
      const { url } = await res.json()
      results.push(url)
    }

    onChange([...value, ...results])
    setUploading(false)
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url, i) => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--color-border)]">
            <Image src={url} alt={`Image ${i + 1}`} fill className="object-cover" sizes="150px" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">Cover</span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <Upload size={20} />
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {value.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <ImageIcon size={12} />
          First image will be used as the cover photo. Up to {maxImages} images.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Update CreateListingForm to use ImageUploader**

In `src/modules/marketplace/components/CreateListingForm.tsx`:
- Add `import { useState } from 'react'`
- Add `import { ImageUploader } from './ImageUploader'`
- Add state: `const [imageUrls, setImageUrls] = useState<string[]>([])`
- Remove the imageUrls textarea section
- Replace with:
```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-[var(--color-text)]">Photos</label>
  <ImageUploader value={imageUrls} onChange={setImageUrls} />
  {/* Hidden inputs to pass URLs to server action */}
  {imageUrls.map((url, i) => (
    <input key={i} type="hidden" name="imageUrls" value={url} />
  ))}
</div>
```

- [ ] **Step 4: Update createListing action to handle array of imageUrls**

In `src/modules/marketplace/actions/createListing.ts`, update imageUrls parsing:
```typescript
// Replace single imageUrls field with array
const imageUrls = formData.getAll('imageUrls').map(String).filter(Boolean)
```

- [ ] **Step 5: Export ImageUploader from module index**

In `src/modules/marketplace/components/index.ts`, add:
```typescript
export { ImageUploader } from './ImageUploader'
```

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/marketplace/components/ImageUploader.tsx src/modules/marketplace/components/CreateListingForm.tsx src/modules/marketplace/actions/createListing.ts src/app/api/marketplace/images/route.ts src/modules/marketplace/components/index.ts
git commit -m "feat(marketplace): replace image URL textarea with Supabase Storage uploader"
```

---

## Task 3: Listing Favorites — Heart Toggle + Favorites Page

**Files:**
- Create: `src/app/api/marketplace/favorites/route.ts`
- Modify: `src/modules/marketplace/lib/queries.ts`
- Modify: `src/modules/marketplace/types/index.ts`
- Create: `src/modules/marketplace/components/FavoriteButton.tsx`
- Modify: `src/modules/marketplace/components/ListingCard.tsx`
- Modify: `src/modules/marketplace/components/ListingDetail.tsx`
- Create: `src/app/marketplace/favorites/page.tsx`

**Context:** Add a heart/bookmark toggle to listing cards and detail pages. Count is shown on each card. Clicking favorites for non-authed users redirects to sign in. Add `/marketplace/favorites` page showing user's saved listings. Grant XP to seller when their listing gets favorited.

- [ ] **Step 1: Add getListingFavoriteCount and getUserFavorites to queries.ts**

In `src/modules/marketplace/lib/queries.ts`, add:

```typescript
export async function toggleListingFavorite(listingId: string, userId: string) {
  const existing = await db.listingFavorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
  })

  if (existing) {
    await db.listingFavorite.delete({ where: { id: existing.id } })
    return { favorited: false }
  }

  const favorite = await db.listingFavorite.create({
    data: { userId, listingId },
    include: { listing: { select: { sellerId: true } } },
  })
  return { favorited: true, sellerId: favorite.listing.sellerId }
}

export async function getUserFavoriteListings(userId: string) {
  const favorites = await db.listingFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        include: {
          seller: { select: { name: true } },
          _count: { select: { favorites: true } },
        },
      },
    },
  })
  return favorites.map((f) => f.listing)
}

export async function getListingFavoriteCounts(listingIds: string[]): Promise<Record<string, number>> {
  const counts = await db.listingFavorite.groupBy({
    by: ['listingId'],
    where: { listingId: { in: listingIds } },
    _count: true,
  })
  return Object.fromEntries(counts.map((c) => [c.listingId, c._count]))
}

export async function isListingFavorited(listingId: string, userId: string): Promise<boolean> {
  const fav = await db.listingFavorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
    select: { id: true },
  })
  return fav !== null
}
```

- [ ] **Step 2: Create favorites API route**

Create `src/app/api/marketplace/favorites/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { toggleListingFavorite } from '@/modules/marketplace/lib/queries'
import { grantXP } from '@/modules/xp/lib/engine'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { listingId } = await request.json()
  if (!listingId) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 })
  }

  const result = await toggleListingFavorite(listingId, session.user.id)

  if (result.favorited && result.sellerId && result.sellerId !== session.user.id) {
    await grantXP({ userId: result.sellerId, event: 'listing_favorited', module: 'marketplace', refId: listingId }).catch(() => {})
  }

  return NextResponse.json(result)
}
```

- [ ] **Step 3: Create FavoriteButton client component**

Create `src/modules/marketplace/components/FavoriteButton.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'

interface FavoriteButtonProps {
  listingId: string
  initialFavorited: boolean
  initialCount: number
  isLoggedIn: boolean
}

export function FavoriteButton({ listingId, initialFavorited, initialCount, isLoggedIn }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    if (!isLoggedIn) {
      router.push('/auth/signin')
      return
    }
    setPending(true)
    const res = await fetch('/api/marketplace/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    })
    if (res.ok) {
      const data = await res.json()
      setFavorited(data.favorited)
      setCount((c) => data.favorited ? c + 1 : Math.max(0, c - 1))
    }
    setPending(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className="flex items-center gap-1 text-sm transition-colors disabled:opacity-50"
    >
      <Heart
        size={16}
        className={favorited ? 'fill-red-500 text-red-500' : 'text-[var(--color-text-muted)]'}
      />
      {count > 0 && <span className={favorited ? 'text-red-500' : 'text-[var(--color-text-muted)]'}>{count}</span>}
    </button>
  )
}
```

- [ ] **Step 4: Add FavoriteButton to ListingCard**

Update `ListingCard.tsx` to accept `favoriteCount` and `isFavorited` and `isLoggedIn` props, and show FavoriteButton in the footer alongside time. Update `ListingSummary` type to include `favoriteCount?: number`.

In `src/modules/marketplace/types/index.ts`, add `favoriteCount?: number` to `ListingSummary`.

In `ListingCard.tsx`:
- Import `FavoriteButton`
- Add props `favoriteCount?: number`, `isFavorited?: boolean`, `isLoggedIn?: boolean`
- Add to footer area: `<FavoriteButton listingId={listing.id} initialFavorited={isFavorited ?? false} initialCount={favoriteCount ?? 0} isLoggedIn={isLoggedIn ?? false} />`

- [ ] **Step 5: Add FavoriteButton to ListingDetail**

In `ListingDetail.tsx`:
- Add props `isFavorited?: boolean`, `favoriteCount?: number`, `isLoggedIn?: boolean`
- Show FavoriteButton prominently near the price/title area

- [ ] **Step 6: Pass favorite data from page components**

In `src/app/marketplace/page.tsx`:
- After fetching listings, fetch favorite counts: `const counts = await getListingFavoriteCounts(listings.map(l => l.id))`
- If session, fetch user's favorites: `const userFavIds = session?.user?.id ? (await getUserFavoriteIds(session.user.id)) : []`
- Pass to ListingGrid as props

In `src/app/marketplace/[slug]/page.tsx`:
- Fetch `isFavorited` using `isListingFavorited` if session exists
- Fetch `favoriteCount` using `_count` on the listing query (update `getListingBySlug` to include `_count: { select: { favorites: true } }`)
- Pass to ListingDetail

- [ ] **Step 7: Create /marketplace/favorites page**

Create `src/app/marketplace/favorites/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { getUserFavoriteListings } from '@/modules/marketplace/lib/queries'
import { ListingGrid } from '@/modules/marketplace'

export const metadata = { title: 'Saved Listings | Marketplace | Ride MTB' }

export default async function FavoritesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const listings = await getUserFavoriteListings(session.user.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/marketplace" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Saved Listings</h1>
      </div>
      {listings.length === 0 ? (
        <div className="py-16 text-center text-[var(--color-text-muted)]">
          <Heart className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p className="text-lg font-medium">No saved listings yet</p>
          <p className="mt-1 text-sm">Tap the heart on any listing to save it here.</p>
          <Link href="/marketplace" className="mt-4 inline-block rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white">Browse Listings</Link>
        </div>
      ) : (
        <ListingGrid listings={listings} />
      )}
    </div>
  )
}
```

- [ ] **Step 8: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/marketplace/favorites/ src/app/marketplace/favorites/ src/modules/marketplace/
git commit -m "feat(marketplace): add listing favorites with heart toggle, count, and favorites page"
```

---

## Task 4: Seller Dashboard — My Listings Management

**Files:**
- Create: `src/app/marketplace/dashboard/page.tsx`
- Create: `src/modules/marketplace/components/SellerDashboard.tsx`
- Modify: `src/modules/marketplace/lib/queries.ts`
- Modify: `src/modules/marketplace/actions/updateStatus.ts`

**Context:** Sellers need a place to manage their listings — view status, mark as sold, delete, see favorite counts. Add `/marketplace/dashboard` page.

- [ ] **Step 1: Add getSellerListings query**

In `src/modules/marketplace/lib/queries.ts`, add:

```typescript
export async function getSellerListings(sellerId: string) {
  return db.listing.findMany({
    where: { sellerId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { favorites: true } },
    },
  })
}
```

- [ ] **Step 2: Create SellerDashboard component**

Create `src/modules/marketplace/components/SellerDashboard.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Heart, Trash2, CheckCircle, Tag } from 'lucide-react'
import { Badge } from '@/ui/components'
import { categoryLabels, conditionLabels, conditionBadgeVariant, formatRelativeTime } from '../types'
import type { ListingStatus } from '../types'

interface DashboardListing {
  id: string
  title: string
  slug: string
  price: number
  category: string
  condition: string
  status: ListingStatus
  imageUrls: unknown
  location: string | null
  createdAt: Date
  _count: { favorites: number }
}

interface SellerDashboardProps {
  listings: DashboardListing[]
}

const statusLabels: Record<ListingStatus, string> = {
  active: 'Active',
  sold: 'Sold',
  reserved: 'Reserved',
  expired: 'Expired',
  removed: 'Removed',
}

const statusVariants: Record<ListingStatus, string> = {
  active: 'success',
  sold: 'default',
  reserved: 'warning',
  expired: 'default',
  removed: 'error',
}

export function SellerDashboard({ listings }: SellerDashboardProps) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  const updateStatus = async (listingId: string, status: ListingStatus) => {
    setPending(listingId)
    await fetch('/api/marketplace/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, status }),
    })
    router.refresh()
    setPending(null)
  }

  const deleteListing = async (listingId: string) => {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setPending(listingId)
    await fetch(`/api/marketplace/listings/${listingId}`, { method: 'DELETE' })
    router.refresh()
    setPending(null)
  }

  if (listings.length === 0) {
    return (
      <div className="py-16 text-center text-[var(--color-text-muted)]">
        <Tag className="mx-auto mb-4 h-12 w-12 opacity-20" />
        <p className="text-lg font-medium">No listings yet</p>
        <Link href="/marketplace/create" className="mt-4 inline-block rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white">Create Your First Listing</Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => {
        const images = listing.imageUrls as string[]
        const cover = images[0] ?? null
        const isLoading = pending === listing.id

        return (
          <div key={listing.id} className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            {/* Thumbnail */}
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg-secondary)]">
              {cover ? (
                <Image src={cover} alt={listing.title} fill className="object-cover" sizes="80px" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">No img</div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col gap-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/marketplace/${listing.slug}`} className="font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] line-clamp-1">
                  {listing.title}
                </Link>
                <span className="shrink-0 font-bold text-[var(--color-text)]">${listing.price.toFixed(2)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariants[listing.status] as never}>{statusLabels[listing.status]}</Badge>
                <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <Heart size={12} className="fill-red-400 text-red-400" /> {listing._count.favorites}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{formatRelativeTime(listing.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {listing.status === 'active' && (
                  <button
                    onClick={() => updateStatus(listing.id, 'sold')}
                    disabled={isLoading}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  >
                    <CheckCircle size={12} /> Mark Sold
                  </button>
                )}
                {listing.status !== 'active' && listing.status !== 'removed' && (
                  <button
                    onClick={() => updateStatus(listing.id, 'active')}
                    disabled={isLoading}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
                  >
                    Relist
                  </button>
                )}
                <button
                  onClick={() => deleteListing(listing.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create status update API route**

Create `src/app/api/marketplace/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { updateListingStatus } from '@/modules/marketplace/lib/queries'
import type { ListingStatus } from '@/modules/marketplace'

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId, status } = await request.json()
  await updateListingStatus(listingId, session.user.id, status as ListingStatus)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create delete listing API route**

Create `src/app/api/marketplace/listings/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { deleteListing } from '@/modules/marketplace/lib/queries'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await deleteListing(id, session.user.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create seller dashboard page**

Create `src/app/marketplace/dashboard/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, LayoutDashboard } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { getSellerListings } from '@/modules/marketplace/lib/queries'
import { SellerDashboard } from '@/modules/marketplace/components/SellerDashboard'

export const metadata = { title: 'My Listings | Marketplace | Ride MTB' }

export default async function MarketplaceDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const listings = await getSellerListings(session.user.id)

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === 'active').length,
    sold: listings.filter((l) => l.status === 'sold').length,
    totalFavorites: listings.reduce((sum, l) => sum + l._count.favorites, 0),
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-[var(--color-primary)]" />
          <h1 className="text-2xl font-bold text-[var(--color-text)]">My Listings</h1>
        </div>
        <Link href="/marketplace/create" className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white">
          <Plus size={16} /> New Listing
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Sold', value: stats.sold },
          { label: 'Favorites', value: stats.totalFavorites },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-[var(--color-border)] p-3 text-center">
            <div className="text-2xl font-bold text-[var(--color-text)]">{value}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
          </div>
        ))}
      </div>

      <SellerDashboard listings={listings as never} />
    </div>
  )
}
```

- [ ] **Step 6: Export new components**

In `src/modules/marketplace/components/index.ts`, add:
```typescript
export { SellerDashboard } from './SellerDashboard'
```

- [ ] **Step 7: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/marketplace/dashboard/ src/app/api/marketplace/ src/modules/marketplace/
git commit -m "feat(marketplace): add seller dashboard with listing management"
```

---

## Task 5: Messaging Integration + XP on Listing Create + Nav Links

**Files:**
- Modify: `src/modules/marketplace/components/ListingDetail.tsx`
- Modify: `src/modules/marketplace/actions/createListing.ts`
- Modify: `src/ui/components/MegaNav/megaNavConfig.ts`

**Context:** Add "Message Seller" button to listing detail that links to `/messages?to=[sellerId]`. Grant 10 XP when a listing is created. Add My Listings and Favorites links to the Marketplace mega-nav panel.

- [ ] **Step 1: Add Message Seller button to ListingDetail**

In `src/modules/marketplace/components/ListingDetail.tsx`:
- Add `currentUserId?: string` prop
- Import `MessageCircle` from lucide-react
- After seller info section, add:

```tsx
{currentUserId && currentUserId !== listing.sellerId && (
  <Link
    href={`/messages?to=${listing.sellerId}`}
    className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
  >
    <MessageCircle size={16} />
    Message Seller
  </Link>
)}
```

- Update `src/app/marketplace/[slug]/page.tsx` to pass `currentUserId={session?.user?.id}` to ListingDetail.

- [ ] **Step 2: Grant XP on listing create**

In `src/modules/marketplace/actions/createListing.ts`:
- Import `grantXP` from `@/modules/xp/lib/engine`
- After successful `createListing(input)` call, add:
```typescript
grantXP({ userId: session.user.id, event: 'listing_created', module: 'marketplace', refId: newListing.id }).catch(() => {})
```

- [ ] **Step 3: Add My Listings + Favorites to Marketplace mega-nav**

In `src/ui/components/MegaNav/megaNavConfig.ts`, update marketplace groups:

```typescript
marketplace: {
  // ... featured unchanged ...
  groups: [
    {
      label: 'Shop',
      links: [
        { icon: Tag, label: 'Browse Listings', href: '/marketplace' },
        { icon: PlusCircle, label: 'Create Listing', href: '/marketplace/create' },
      ],
    },
    {
      label: 'My Stuff',
      links: [
        { icon: Heart, label: 'Saved Listings', href: '/marketplace/favorites' },
        { icon: LayoutList, label: 'My Listings', href: '/marketplace/dashboard' },
      ],
    },
  ],
},
```

Import `Heart` from lucide-react in megaNavConfig.ts.

- [ ] **Step 4: Full build check**

```bash
npx next build 2>&1 | tail -20
```

Expected: build completes with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/marketplace/ src/app/marketplace/ src/ui/components/MegaNav/megaNavConfig.ts
git commit -m "feat(marketplace): message seller button, XP on listing create, nav links"
```

---

## Task 6: Deploy

- [ ] **Step 1: Final build check locally**

```bash
npx next build 2>&1 | grep -E "(Error|error|✓)" | tail -10
```

- [ ] **Step 2: Deploy to Vercel**

```bash
vercel --prod 2>&1 | grep -E "(Production:|Aliased:|Error)"
```

- [ ] **Step 3: Smoke test checklist**
  - Browse `/marketplace` — listings load, filters work
  - Create listing at `/marketplace/create` — image upload works, listing appears
  - Toggle favorite on a listing — heart fills, count increments
  - View `/marketplace/favorites` — saved listing appears
  - View `/marketplace/dashboard` — own listings with stats
  - Message Seller button visible on listing (not own listing)
  - Verify XP granted after creating listing (check `/dashboard` XP total)

- [ ] **Step 4: Commit smoke test sign-off**

```bash
git commit --allow-empty -m "chore: marketplace MVP deployed and smoke tested"
```
