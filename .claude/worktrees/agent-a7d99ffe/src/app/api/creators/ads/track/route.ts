import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const TEN_MINUTES_MS = 10 * 60 * 1000

export async function GET(req: NextRequest): Promise<NextResponse> {
  const impressionId = req.nextUrl.searchParams.get('impressionId')
  const event = req.nextUrl.searchParams.get('event') ?? 'impression'

  if (!impressionId) return NextResponse.json({ error: 'Missing impressionId' }, { status: 400 })

  // complete/skip events are acknowledged without billing or impression validation.
  // Known tradeoff: a malicious caller could fire complete/skip for any impressionId
  // (including non-existent ones). Acceptable because these events have no financial
  // impact — they exist only for future analytics. If analytics abuse becomes a
  // concern, add the same existence+status check as the 'impression' path.
  if (event === 'complete' || event === 'skip') {
    return NextResponse.json({ ok: true })
  }

  const impression = await db.adImpression.findUnique({
    where: { id: impressionId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      campaignId: true,
      videoId: true,
      campaign: { select: { cpmCents: true } },
      video: {
        select: {
          creatorId: true,
          creator: { select: { revenueSharePct: true } },
        },
      },
    },
  })

  if (!impression) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (impression.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 409 })

  const ageMs = Date.now() - impression.createdAt.getTime()
  if (ageMs > TEN_MINUTES_MS) return NextResponse.json({ error: 'Impression expired' }, { status: 410 })

  // earnings = floor((cpmCents / 1000) × revenueSharePct / 100)
  const earningsCents = Math.floor(
    (impression.campaign.cpmCents / 1000) * (impression.video.creator.revenueSharePct / 100),
  )

  await db.adImpression.update({
    where: { id: impressionId },
    data: { status: 'confirmed', earningsCents },
  })

  await db.walletTransaction.create({
    data: {
      creatorId: impression.video.creatorId,
      amountCents: earningsCents,
      type: 'earning',
      impressionId: impressionId,
    },
  })

  return NextResponse.json({ ok: true })
}
