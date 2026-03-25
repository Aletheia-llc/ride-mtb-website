import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { rateLimit } from '@/lib/rate-limit'
import { buildVastXml, buildEmptyVast } from '@/modules/creators/lib/vast'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function xmlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  try {
    await rateLimit({ identifier: ip, action: 'vast', maxPerMinute: 30 })
  } catch {
    return xmlResponse(buildEmptyVast())
  }

  const videoId = req.nextUrl.searchParams.get('videoId')
  if (!videoId) return xmlResponse(buildEmptyVast())

  const video = await db.creatorVideo.findUnique({
    where: { id: videoId },
    select: { id: true, creatorId: true, category: true, status: true },
  })
  if (!video || video.status !== 'live') return xmlResponse(buildEmptyVast())

  const now = new Date()
  const campaign = await db.adCampaign.findFirst({
    where: {
      status: 'active',
      startDate: { lte: now },
      endDate: { gte: now },
      OR: [{ categoryFilter: null }, { categoryFilter: video.category }],
      AND: [
        {
          OR: [
            { creatorTargets: { none: {} } },
            { creatorTargets: { some: { creatorProfileId: video.creatorId } } },
          ],
        },
      ],
    },
    orderBy: [{ cpmCents: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      advertiserName: true,
      creativeUrl: true,
      cpmCents: true,
      dailyImpressionCap: true,
      creatorTargets: { select: { creatorProfileId: true } },
    },
  })
  if (!campaign) return xmlResponse(buildEmptyVast())

  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const todayCount = await db.adImpression.count({
    where: { campaignId: campaign.id, createdAt: { gte: startOfDay } },
  })
  if (todayCount >= campaign.dailyImpressionCap) return xmlResponse(buildEmptyVast())

  const impression = await db.adImpression.create({
    data: { campaignId: campaign.id, videoId: video.id, status: 'pending' },
    select: { id: true },
  })

  const xml = buildVastXml({
    impressionId: impression.id,
    creativeUrl: campaign.creativeUrl,
    advertiserName: campaign.advertiserName,
    baseUrl: BASE_URL,
    durationSeconds: 30,
  })

  return xmlResponse(xml)
}
