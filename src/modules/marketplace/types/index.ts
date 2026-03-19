/**
 * Marketplace module types
 *
 * Re-exports Prisma-generated model types and defines extended / input types
 * used across the marketplace module.
 *
 * Systematic adaptations from standalone:
 *   - `Conversation`  → `ListingConversation`
 *   - `Message`       → `ListingMessage`
 *   - `ListingCondition` → `ItemCondition` (enum name in monolith schema)
 */

export type {
  Listing,
  ListingPhoto,
  SellerProfile,
  SellerReview,
  Offer,
  Transaction,
  ListingConversation,
  ListingMessage,
  ListingSave,
  ListingReport,
  ListingStatus,
  ListingCategory,
  ItemCondition,
  FulfillmentType,
  OfferStatus,
  TransactionStatus,
  User,
  UserBike,
} from '@/generated/prisma/client'

import type {
  Listing,
  ListingPhoto,
  ListingCategory,
  ItemCondition,
  FulfillmentType,
  ListingConversation,
  ListingMessage,
  Offer,
  Transaction,
  User,
  SellerProfile,
  ListingReport,
} from '@/generated/prisma/client'

// ---------------------------------------------------------------------------
// Listing extended shapes
// ---------------------------------------------------------------------------

export type ListingWithPhotos = Listing & {
  photos: ListingPhoto[]
  seller: Pick<User, 'id' | 'name' | 'image'> & {
    sellerProfile: Pick<
      SellerProfile,
      'averageRating' | 'ratingCount' | 'totalSales' | 'isVerified' | 'isTrusted'
    > | null
  }
}

// ---------------------------------------------------------------------------
// Browse / search
// ---------------------------------------------------------------------------

export type BrowseOptions = {
  category?: ListingCategory
  condition?: ItemCondition[]
  fulfillment?: FulfillmentType
  minPrice?: number
  maxPrice?: number
  brand?: string
  city?: string
  state?: string
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'most_saved'
  cursor?: string
  limit?: number
}

export type PaginatedListings = {
  listings: ListingWithPhotos[]
  nextCursor: string | null
  total: number
}

// ---------------------------------------------------------------------------
// Listing create / update inputs
// ---------------------------------------------------------------------------

export type CreateListingInput = {
  title: string
  description: string
  category: ListingCategory
  condition: ItemCondition
  brand?: string
  modelName?: string
  year?: number
  tags?: string[]
  price: number
  acceptsOffers?: boolean
  minOfferPercent?: number
  fulfillment: FulfillmentType
  shippingCost?: number
  estimatedWeight?: number
  packageLength?: number
  packageWidth?: number
  packageHeight?: number
  city?: string
  state?: string
  zipCode?: string
  fromGarageBikeId?: string  // UserBike.id — set when listed via "Sell from Garage"
}

export type UpdateListingInput = Partial<CreateListingInput>

// ---------------------------------------------------------------------------
// Messaging
// ---------------------------------------------------------------------------

export type ConversationWithDetails = ListingConversation & {
  listing: Pick<Listing, 'id' | 'title' | 'slug' | 'price'> & {
    photos: Pick<ListingPhoto, 'url' | 'isCover'>[]
  }
  otherParty: Pick<User, 'id' | 'name' | 'image'>
  lastMessage: Pick<ListingMessage, 'body' | 'createdAt' | 'isSystemMessage'> | null
  unreadCount: number
}

export type MessageWithSender = ListingMessage & {
  sender: Pick<User, 'id' | 'name' | 'image'>
}

export type ConversationFull = ListingConversation & {
  listing: Pick<Listing, 'id' | 'title' | 'slug' | 'price'> & {
    photos: Pick<ListingPhoto, 'url' | 'isCover'>[]
  }
  messages: MessageWithSender[]
  otherParty: Pick<User, 'id' | 'name' | 'image'>
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export type OfferWithDetails = Offer & {
  listing: Pick<Listing, 'id' | 'title' | 'slug' | 'price'> & {
    photos: Pick<ListingPhoto, 'url' | 'isCover'>[]
  }
  buyer: Pick<User, 'id' | 'name' | 'image'>
}

export type OfferChainItem = Offer & {
  sender: Pick<User, 'id' | 'name' | 'image'>
}

// ---------------------------------------------------------------------------
// Seller trust
// ---------------------------------------------------------------------------

export type TrustLevel = 'new' | 'established' | 'trusted' | 'power'

export type SellerReviewWithBuyer = {
  id: string
  rating: number
  body: string | null
  tags: string[]
  createdAt: Date
  buyer: Pick<User, 'id' | 'name' | 'image'>
}

export type SellerProfileWithReviews = {
  id: string
  userId: string
  user: Pick<User, 'id' | 'name' | 'image'>
  isVerified: boolean
  totalSales: number
  totalRevenue: number
  averageRating: number | null
  ratingCount: number
  avgResponseTime: number | null
  isTrusted: boolean
  stripeOnboarded: boolean
  trustLevel: TrustLevel
  createdAt: Date
  reviews: SellerReviewWithBuyer[]
  listings: ListingWithPhotos[]
}

export type SellerDashboardData = {
  profile: SellerProfileWithReviews
  stats: {
    activeListings: number
    soldListings: number
    totalRevenue: number
    thisMonthSales: number
    pendingOffers: number
  }
  recentReviews: SellerReviewWithBuyer[]
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export type TransactionWithDetails = Transaction & {
  listing: Pick<Listing, 'id' | 'title' | 'slug' | 'price'> & {
    photos: Pick<ListingPhoto, 'url' | 'isCover'>[]
  }
  otherParty: Pick<User, 'id' | 'name' | 'image'>
}

export type CheckoutData = {
  listing: ListingWithPhotos
  salePrice: number
  shippingCost: number
  platformFee: number
  sellerPayout: number
  totalCharged: number
}

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

export type ShippingRate = {
  carrier: string      // "USPS", "UPS", "FedEx", "Seller"
  service: string      // "Priority Mail", "Ground", etc.
  rate: number         // dollar amount
  estimatedDays: number
  id: string           // unique identifier for selection
}

export type ShippingEstimateRequest = {
  fromZip: string
  toZip: string
  weight: number       // lbs
  length: number       // inches
  width: number        // inches
  height: number       // inches
}

// ---------------------------------------------------------------------------
// Admin / reports
// ---------------------------------------------------------------------------

export type ReportWithDetails = ListingReport & {
  listing: Pick<Listing, 'id' | 'title' | 'slug' | 'status'> & {
    photos: Pick<ListingPhoto, 'url' | 'isCover'>[]
    seller: Pick<User, 'id' | 'name' | 'email'>
  }
  reporter: Pick<User, 'id' | 'name' | 'email'>
}

export type AdminListingWithDetails = Listing & {
  photos: ListingPhoto[]
  seller: Pick<User, 'id' | 'name' | 'email' | 'image'>
  _count: { reports: number; offers: number }
}

export type AdminTransactionWithDetails = Transaction & {
  listing: Pick<Listing, 'id' | 'title' | 'slug'> & {
    photos: Pick<ListingPhoto, 'url' | 'isCover'>[]
  }
  buyer: Pick<User, 'id' | 'name' | 'email'>
  seller: Pick<User, 'id' | 'name' | 'email'>
}

export type AdminSellerWithDetails = {
  id: string
  userId: string
  user: Pick<User, 'id' | 'name' | 'email' | 'image'>
  isVerified: boolean
  isTrusted: boolean
  totalSales: number
  averageRating: number | null
  ratingCount: number
  createdAt: Date
  _count: { listings: number }
}
