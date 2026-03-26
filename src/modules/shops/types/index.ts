export interface ShopSummary {
  id: string
  name: string
  slug: string
  city: string
  state: string
  phone: string | null
  imageUrl: string | null
  servicesCount: number
  brandsCount: number
}

export interface ShopAffiliateLink {
  slug: string
  name: string
  url: string
}

export interface ShopDetailData {
  id: string
  ownerId: string | null
  name: string
  slug: string
  description: string | null
  address: string
  city: string
  state: string
  zipCode: string | null
  country: string
  phone: string | null
  email: string | null
  websiteUrl: string | null
  latitude: number | null
  longitude: number | null
  imageUrl: string | null
  services: string[]
  brands: string[]
  hoursJson?: unknown
  avgOverallRating?: number | null
  avgServiceRating?: number | null
  avgPricingRating?: number | null
  avgSelectionRating?: number | null
  reviewCount?: number
  createdAt: Date
  updatedAt: Date
  affiliateLinks?: ShopAffiliateLink[]
}
