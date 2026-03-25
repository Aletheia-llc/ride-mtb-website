export type FeedItemType = 'course' | 'trail' | 'forum' | 'event' | 'review' | 'buysell'
export type FeedTab = 'forYou' | 'latest' | 'popular'

export interface FeedItem {
  id: string
  type: FeedItemType
  title: string
  subtitle: string
  url: string
  imageUrl?: string
  tags: string[]
  meta: string
  reason?: string
  // Internal fields (stripped before HTTP response)
  category: string
  engagementScore: number
  createdAt: Date
}

export interface FeedResponse {
  items: Omit<FeedItem, 'category' | 'engagementScore' | 'createdAt'>[]
  nextCursor: string | null
  hasMore: boolean
}
