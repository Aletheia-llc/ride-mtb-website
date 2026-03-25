'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/client'
import { requireAuth } from '@/lib/auth/guards'

// ---------------------------------------------------------------------------
// Save a listing (creates ListingSave record, increments listing.saveCount)
// ---------------------------------------------------------------------------

export async function saveListing(listingId: string): Promise<void> {
  const user = await requireAuth()
  const userId = user.id

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, slug: true },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  const existingSave = await db.listingSave.findUnique({
    where: { userId_listingId: { userId, listingId } },
  })

  if (existingSave) return // already saved — idempotent

  await db.listingSave.create({
    data: { userId, listingId },
  })

  await db.listing.update({
    where: { id: listingId },
    data: { saveCount: { increment: 1 } },
  })

  revalidatePath(`/buy-sell/${listing.slug}`)
  revalidatePath('/buy-sell/saved')
}

// ---------------------------------------------------------------------------
// Unsave a listing (deletes ListingSave record, decrements listing.saveCount)
// ---------------------------------------------------------------------------

export async function unsaveListing(listingId: string): Promise<void> {
  const user = await requireAuth()
  const userId = user.id

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, slug: true },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  const save = await db.listingSave.findUnique({
    where: { userId_listingId: { userId, listingId } },
  })

  if (!save) {
    return // Already unsaved — no-op
  }

  await db.listingSave.delete({
    where: { userId_listingId: { userId, listingId } },
  })

  await db.listing.update({
    where: { id: listingId },
    data: { saveCount: { decrement: 1 } },
  })

  revalidatePath(`/buy-sell/${listing.slug}`)
  revalidatePath('/buy-sell/saved')
}

// ---------------------------------------------------------------------------
// Toggle save: save if not saved, unsave if already saved
// ---------------------------------------------------------------------------

export async function toggleSave(listingId: string): Promise<{ saved: boolean }> {
  // Call requireAuth() once here; delegates (saveListing/unsaveListing) will call it
  // again, but that is a minor cost. The single source of truth for userId is here.
  const user = await requireAuth()
  const userId = user.id

  const existing = await db.listingSave.findUnique({
    where: { userId_listingId: { userId, listingId } },
  })

  if (existing) {
    await unsaveListing(listingId)
    return { saved: false }
  } else {
    await saveListing(listingId)
    return { saved: true }
  }
}

// ---------------------------------------------------------------------------
// Check whether the current user has saved a listing
// ---------------------------------------------------------------------------

export async function isListingSaved(listingId: string): Promise<boolean> {
  const user = await requireAuth()
  const userId = user.id

  const save = await db.listingSave.findUnique({
    where: { userId_listingId: { userId, listingId } },
    select: { id: true },
  })

  return save !== null
}

// ---------------------------------------------------------------------------
// Get the total save count for a listing
// ---------------------------------------------------------------------------

export async function getSavedCount(listingId: string): Promise<number> {
  const count = await db.listingSave.count({
    where: { listingId },
  })

  return count
}
