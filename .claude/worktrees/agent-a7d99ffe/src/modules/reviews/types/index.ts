// ── Gear Reviews module shared types ─────────────────────────
// Aligned with query return shapes from lib/queries.ts

export type GearCategory =
  | 'bikes'
  | 'helmets'
  | 'protection'
  | 'shoes'
  | 'clothing'
  | 'wheels'
  | 'suspension'
  | 'drivetrain'
  | 'brakes'
  | 'cockpit'
  | 'accessories'
  | 'tools'
  | 'other'

export const GEAR_CATEGORIES: { value: GearCategory; label: string }[] = [
  { value: 'bikes', label: 'Bikes' },
  { value: 'helmets', label: 'Helmets' },
  { value: 'protection', label: 'Protection' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'wheels', label: 'Wheels' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'drivetrain', label: 'Drivetrain' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'cockpit', label: 'Cockpit' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'tools', label: 'Tools' },
  { value: 'other', label: 'Other' },
]

export interface GearReviewAuthor {
  id: string
  name: string | null
  image: string | null
}

export interface GearReviewSummary {
  id: string
  title: string
  slug: string
  category: GearCategory
  brand: string
  productName: string
  rating: number
  createdAt: Date
  user: GearReviewAuthor
}

export interface GearReviewDetail {
  id: string
  userId: string
  title: string
  slug: string
  category: GearCategory
  brand: string
  productName: string
  rating: number
  pros: string | null
  cons: string | null
  content: string
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
  user: GearReviewAuthor
}

export function getCategoryLabel(category: GearCategory): string {
  return GEAR_CATEGORIES.find((c) => c.value === category)?.label ?? category
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
