// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

const PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days
const FETCH_TIMEOUT_MS = 2_000
const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/

interface LinkPreview {
  url: string
  title: string | null
  description: string | null
  imageUrl: string | null
}

function extractFirstUrl(content: string): string | null {
  const match = content.match(/https?:\/\/[^\s"'<>]+/)
  if (!match) return null
  try {
    const u = new URL(match[0])
    // Skip internal links
    if (u.hostname.includes('ridemtb')) return null
    // Block private IPs
    if (PRIVATE_IP.test(u.hostname)) return null
    return u.href
  } catch {
    return null
  }
}

async function fetchOgData(url: string): Promise<Omit<LinkPreview, 'url'>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RideMTB/1.0 LinkPreview' },
    })
    if (!res.ok) return { title: null, description: null, imageUrl: null }
    const html = await res.text()

    const get = (prop: string): string | null => {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ??
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'))
      return m?.[1]?.trim() ?? null
    }

    const titleFallback = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null

    return {
      title: get('title') ?? titleFallback,
      description: get('description'),
      imageUrl: get('image'),
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Fetches or returns cached link preview for the first URL found in `content`.
 * Returns null if no URL found, fetch fails, or no OG data available.
 */
export async function resolveContentLinkPreview(content: string): Promise<{ url: string; preview: LinkPreview } | null> {
  const url = extractFirstUrl(content)
  if (!url) return null

  // Check cache
  const cached = await db.forumLinkPreview.findUnique({ where: { url } })
  if (cached && Date.now() - cached.fetchedAt.getTime() < PREVIEW_TTL_MS) {
    return { url, preview: { url, title: cached.title, description: cached.description, imageUrl: cached.imageUrl } }
  }

  // Fetch fresh
  try {
    const data = await fetchOgData(url)
    if (!data.title && !data.description && !data.imageUrl) return null

    await db.forumLinkPreview.upsert({
      where: { url },
      update: { ...data, fetchedAt: new Date() },
      create: { url, ...data, fetchedAt: new Date() },
    })

    return { url, preview: { url, ...data } }
  } catch {
    return null
  }
}
