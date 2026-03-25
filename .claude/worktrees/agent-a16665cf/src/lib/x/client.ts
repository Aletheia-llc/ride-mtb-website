import 'server-only'

// Mountain bike affiliated X accounts to pull from
const MTB_ACCOUNTS = [
  'RedBullMTB',
  'pinkbike',
  'BikeRadar',
  'enduro_mtbmag',
  'vital_mtb',
  'trailforks',
]

const SEARCH_QUERY = `(${MTB_ACCOUNTS.map((a) => `from:${a}`).join(' OR ')}) -is:retweet -is:reply lang:en`

export interface XTweet {
  id: string
  text: string
  createdAt: string
  url: string
  metrics: {
    likes: number
    retweets: number
    replies: number
  }
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  }
  mediaUrl: string | null
}

interface TwitterApiResponse {
  data?: Array<{
    id: string
    text: string
    created_at: string
    author_id: string
    public_metrics: {
      like_count: number
      retweet_count: number
      reply_count: number
    }
    attachments?: { media_keys?: string[] }
  }>
  includes?: {
    users?: Array<{
      id: string
      name: string
      username: string
      profile_image_url?: string
    }>
    media?: Array<{
      media_key: string
      type: string
      url?: string
      preview_image_url?: string
    }>
  }
  errors?: Array<{ message: string }>
}

export async function fetchMTBTweets(count = 8): Promise<XTweet[]> {
  const token = process.env.TWITTER_BEARER_TOKEN
  if (!token) {
    console.warn('[XFeed] TWITTER_BEARER_TOKEN not set')
    return []
  }

  const params = new URLSearchParams({
    query: SEARCH_QUERY,
    max_results: String(Math.min(count, 10)),
    'tweet.fields': 'created_at,author_id,public_metrics,attachments',
    expansions: 'author_id,attachments.media_keys',
    'media.fields': 'url,preview_image_url,type',
    'user.fields': 'name,username,profile_image_url',
  })

  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      // Cache for 5 minutes — keeps the feed fresh without hammering the API
      next: { revalidate: 300 },
    },
  )

  if (!res.ok) {
    console.error(`[XFeed] Twitter API error ${res.status}: ${await res.text()}`)
    return []
  }

  const json: TwitterApiResponse = await res.json()

  if (!json.data?.length) return []

  const userMap = new Map(
    (json.includes?.users ?? []).map((u) => [u.id, u]),
  )
  const mediaMap = new Map(
    (json.includes?.media ?? []).map((m) => [m.media_key, m]),
  )

  return json.data.map((tweet) => {
    const author = userMap.get(tweet.author_id)
    const mediaKey = tweet.attachments?.media_keys?.[0]
    const media = mediaKey ? mediaMap.get(mediaKey) : undefined
    const mediaUrl = media?.url ?? media?.preview_image_url ?? null

    return {
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      url: `https://x.com/${author?.username ?? 'x'}/status/${tweet.id}`,
      metrics: {
        likes: tweet.public_metrics.like_count,
        retweets: tweet.public_metrics.retweet_count,
        replies: tweet.public_metrics.reply_count,
      },
      author: {
        id: tweet.author_id,
        name: author?.name ?? 'Unknown',
        username: author?.username ?? 'unknown',
        avatarUrl: author?.profile_image_url?.replace('_normal', '_bigger') ?? null,
      },
      mediaUrl,
    }
  })
}
