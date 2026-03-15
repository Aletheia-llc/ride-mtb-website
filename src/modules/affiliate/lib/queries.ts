import 'server-only'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function getAffiliateLinks() {
  return db.affiliateLink.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      shop: { select: { name: true } },
      _count: { select: { clicks: true } },
    },
  })
}

export async function getAffiliateLinkStats(linkId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const [totalClicks, recentClicks] = await Promise.all([
    db.affiliateClick.count({ where: { linkId } }),
    db.affiliateClick.count({ where: { linkId, createdAt: { gte: since } } }),
  ])
  return { totalClicks, recentClicks }
}
