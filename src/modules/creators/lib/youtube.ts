import 'server-only'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// ── Pure utility functions (no API calls, fully testable) ──

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('/')[0] || null
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v')
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null
    }
    return null
  } catch {
    return null
  }
}

export function extractChannelHandle(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('youtube.com')) return null
    const match = u.pathname.match(/^\/@([\w-]+)/)
    if (match) return `@${match[1]}`
    const channelMatch = u.pathname.match(/^\/channel\/(UC[\w-]+)/)
    if (channelMatch) return channelMatch[1]
    return null
  } catch {
    return null
  }
}

export function formatDuration(iso8601: string): number {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const h = parseInt(match[1] ?? '0')
  const m = parseInt(match[2] ?? '0')
  const s = parseInt(match[3] ?? '0')
  return h * 3600 + m * 60 + s
}

// ── YouTube Data API calls ──

export async function resolveChannelId(handleOrId: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.warn('[youtube] YOUTUBE_API_KEY not configured')
    return null
  }

  // Already a channel ID (starts with UC, 24 chars)
  if (/^UC[\w-]{22}$/.test(handleOrId)) return handleOrId

  const handle = handleOrId.startsWith('@') ? handleOrId.slice(1) : handleOrId
  const url = `${YOUTUBE_API_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as { items?: Array<{ id: string }> }
  return data.items?.[0]?.id ?? null
}

export interface YouTubeVideoMeta {
  youtubeVideoId: string
  title: string
  description: string
  thumbnailUrl: string
  duration: number // seconds
}

export async function fetchVideoMetadata(youtubeVideoId: string): Promise<YouTubeVideoMeta | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return null

  const url = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,status&id=${youtubeVideoId}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as {
    items?: Array<{
      snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default: { url: string } } }
      contentDetails: { duration: string }
      status: { privacyStatus: string; madeForKids: boolean }
    }>
  }
  const item = data.items?.[0]
  if (!item) return null
  // Skip private/unlisted/age-restricted
  if (item.status.privacyStatus !== 'public') return null
  if (item.status.madeForKids) return null

  return {
    youtubeVideoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default.url,
    duration: formatDuration(item.contentDetails.duration),
  }
}

export async function fetchChannelBackCatalog(channelId: string, limit = 50): Promise<string[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return []

  const videoIds: string[] = []
  let pageToken: string | undefined

  while (videoIds.length < limit) {
    const params = new URLSearchParams({
      part: 'id',
      channelId,
      maxResults: '50',
      order: 'date',
      type: 'video',
      key: apiKey,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`)
    if (!res.ok) break
    const data = await res.json() as {
      items?: Array<{ id: { videoId: string } }>
      nextPageToken?: string
    }
    for (const item of data.items ?? []) {
      videoIds.push(item.id.videoId)
      if (videoIds.length >= limit) break
    }
    if (!data.nextPageToken || videoIds.length >= limit) break
    pageToken = data.nextPageToken
  }

  return videoIds.slice(0, limit)
}

export async function parseRssFeed(channelId: string): Promise<string[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  const res = await fetch(rssUrl)
  if (!res.ok) return []
  const xml = await res.text()
  const matches = xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)
  return Array.from(matches, (m) => m[1])
}
