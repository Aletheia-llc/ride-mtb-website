// ── Marketplace module shared types ─────────────────────────
// Aligned with query return shapes from lib/queries.ts

export type ListingCategory =
  | 'complete_bikes'
  | 'frames'
  | 'wheels'
  | 'suspension'
  | 'drivetrain'
  | 'brakes'
  | 'cockpit'
  | 'protection'
  | 'clothing'
  | 'accessories'
  | 'other'

export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'

export type ListingStatus = 'active' | 'sold' | 'reserved' | 'expired' | 'removed'

export interface ListingSummary {
  id: string
  title: string
  slug: string
  price: number
  category: ListingCategory
  condition: ItemCondition
  location: string | null
  firstImageUrl: string | null
  status: ListingStatus
  sellerName: string | null
  createdAt: Date
  favoriteCount?: number
  isFavorited?: boolean
}

export interface ListingDetailData {
  id: string
  sellerId: string
  title: string
  slug: string
  description: string
  price: number
  category: ListingCategory
  condition: ItemCondition
  location: string | null
  imageUrls: string[]
  status: ListingStatus
  createdAt: Date
  updatedAt: Date
  seller: {
    id: string
    name: string | null
    image: string | null
  }
  favoriteCount?: number
  isFavorited?: boolean
}

// ── Display helpers ─────────────────────────────────────────

export const categoryLabels: Record<ListingCategory, string> = {
  complete_bikes: 'Complete Bikes',
  frames: 'Frames',
  wheels: 'Wheels',
  suspension: 'Suspension',
  drivetrain: 'Drivetrain',
  brakes: 'Brakes',
  cockpit: 'Cockpit',
  protection: 'Protection',
  clothing: 'Clothing',
  accessories: 'Accessories',
  other: 'Other',
}

export const conditionLabels: Record<ItemCondition, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

export const conditionBadgeVariant: Record<ItemCondition, 'success' | 'info' | 'default' | 'warning' | 'error'> = {
  new: 'success',
  like_new: 'info',
  good: 'default',
  fair: 'warning',
  poor: 'error',
}

export const statusLabels: Record<ListingStatus, string> = {
  active: 'Active',
  sold: 'Sold',
  reserved: 'Reserved',
  expired: 'Expired',
  removed: 'Removed',
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(months / 12)
  return `${years}y ago`
}
