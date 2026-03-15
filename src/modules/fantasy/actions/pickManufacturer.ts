'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'

export type PickManufacturerState = { error?: string }

export async function pickManufacturer(
  _prev: PickManufacturerState,
  formData: FormData
): Promise<PickManufacturerState> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const userId = session.user.id

  const seriesId = formData.get('seriesId') as string
  const season = Number(formData.get('season'))
  const manufacturerId = formData.get('manufacturerId') as string

  if (!seriesId || !season || !manufacturerId) return { error: 'Missing required fields' }

  // Check if pick is already locked for this user/series/season
  const existingPick = await db.manufacturerPick.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    select: { lockedAt: true },
  })
  if (existingPick?.lockedAt) {
    return { error: 'Your manufacturer pick is locked for this season — no changes allowed after Round 1.' }
  }

  // Check pick window: open until Round 1 rosterDeadline
  const round1 = await db.fantasyEvent.findFirst({
    where: { seriesId },
    orderBy: { raceDate: 'asc' },
    select: { rosterDeadline: true },
  })
  if (round1 && round1.rosterDeadline < new Date()) {
    return { error: 'The manufacturer pick window is closed. Picks lock at the Round 1 roster deadline.' }
  }

  await db.manufacturerPick.upsert({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    create: { userId, seriesId, season, manufacturerId },
    update: { manufacturerId },
  })

  revalidatePath(`/fantasy`)
  return {}
}
