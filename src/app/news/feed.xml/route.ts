import { NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { getRecentPublishedArticles } from '@/modules/editorial/lib/queries'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const articles = await getRecentPublishedArticles(50)

  const items = articles
    .map((a) => {
      const url = `${BASE_URL}/news/${a.slug}`
      const pubDate = a.publishedAt
        ? new Date(a.publishedAt).toUTCString()
        : new Date(a.createdAt).toUTCString()
      const description = a.excerpt ? escapeXml(a.excerpt) : ''

      return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      ${a.authorName ? `<author>${escapeXml(a.authorName)}</author>` : ''}
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ride MTB News</title>
    <link>${BASE_URL}/news</link>
    <description>The latest mountain biking news from Ride MTB</description>
    <language>en-us</language>
    <atom:link href="${BASE_URL}/news/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
