import 'server-only'

export interface RssItem {
  title: string
  link: string
  description: string
  pubDate: string
  imageUrl: string | null
  sourceName: string
  sourceUrl: string
}

const MTB_FEEDS = [
  { name: 'Bikerumor', url: 'https://bikerumor.com/feed/', siteUrl: 'https://bikerumor.com' },
  { name: 'Enduro MTB', url: 'https://enduro-mtb.com/en/feed/', siteUrl: 'https://enduro-mtb.com' },
  { name: 'MBR', url: 'https://www.mbr.co.uk/feed', siteUrl: 'https://www.mbr.co.uk' },
  { name: 'Dirt', url: 'https://www.dirtmountainbike.com/feed/', siteUrl: 'https://www.dirtmountainbike.com' },
  { name: 'Bikepacking', url: 'https://bikepacking.com/feed/', siteUrl: 'https://bikepacking.com' },
]

function extractTag(xml: string, tag: string): string {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = xml.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

function extractImage(itemXml: string): string | null {
  // media:content
  const media = itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*\/?>/i)
  if (media?.[1] && media[1].match(/\.(jpg|jpeg|png|webp)/i)) return media[1]

  // enclosure
  const enc = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i)
  if (enc?.[1] && enc[1].match(/\.(jpg|jpeg|png|webp)/i)) return enc[1]

  // og:image in description
  const og = itemXml.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i)
  if (og?.[1]) return og[1].split('?')[0]

  return null
}

function parseItems(xml: string, sourceName: string, sourceUrl: string): RssItem[] {
  const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []
  return itemMatches.slice(0, 5).map((item) => ({
    title: extractTag(item, 'title').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
    link: extractTag(item, 'link') || extractTag(item, 'guid'),
    description: extractTag(item, 'description')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
      .slice(0, 160),
    pubDate: extractTag(item, 'pubDate') || extractTag(item, 'dc:date'),
    imageUrl: extractImage(item),
    sourceName,
    sourceUrl,
  }))
}

async function fetchFeed(feed: (typeof MTB_FEEDS)[0]): Promise<RssItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'RideMTB/1.0 RSS Reader' },
      next: { revalidate: 600 }, // 10-min cache per feed
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseItems(xml, feed.name, feed.siteUrl)
  } catch {
    return []
  }
}

export async function fetchMTBNews(count = 8): Promise<RssItem[]> {
  const results = await Promise.allSettled(MTB_FEEDS.map(fetchFeed))
  const all = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((item) => item.title && item.link)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  return all.slice(0, count)
}
