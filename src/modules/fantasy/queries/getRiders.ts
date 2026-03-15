import { db } from '@/lib/db/client'

export async function getRidersForEvent(eventId: string) {
  const entries = await db.riderEventEntry.findMany({
    where: { eventId },
    include: { rider: true },
    orderBy: { marketPriceCents: 'desc' },
  })

  return entries.map(e => ({
    riderId: e.riderId,
    name: e.rider.name,
    nationality: e.rider.nationality,
    photoUrl: e.rider.photoUrl,
    gender: e.rider.gender,
    basePriceCents: e.basePriceCents,
    marketPriceCents: e.marketPriceCents,
    ownershipPct: e.ownershipPct,
    isWildcardEligible: e.marketPriceCents < 20_000_000,
    fantasyPoints: e.fantasyPoints,
  }))
}
