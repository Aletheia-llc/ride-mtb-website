// src/modules/fantasy/queries/getSeasonPass.ts
import { db } from '@/lib/db/client'

/** Returns true if the user has an active season pass for this series+season */
export async function hasSeasonPass(
  userId: string,
  seriesId: string,
  season: number
): Promise<boolean> {
  const pass = await db.seasonPassPurchase.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    select: { status: true },
  })
  return pass?.status === 'active'
}

/** Full pass record, or null */
export async function getSeasonPass(
  userId: string,
  seriesId: string,
  season: number
) {
  return db.seasonPassPurchase.findUnique({
    where: { userId_seriesId_season: { userId, seriesId, season } },
    select: { id: true, status: true, createdAt: true },
  })
}
