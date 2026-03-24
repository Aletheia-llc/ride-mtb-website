// Marketplace module barrel — re-exports all actions, lib utilities, and types.
//
// NOTE: 'use server' is NOT added here. The directive lives at the file level
// in each individual action file; barrel re-exports do not need it.
//
// Conflict resolution:
//   getFeaturedListings — exported by both actions/listings.ts (re-exported
//   from lib/queries) and lib/queries.ts directly. The actions version is the
//   canonical public API; the lib/queries version is aliased as
//   getFeaturedListingsQuery to avoid a duplicate export error.

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export * from './actions/listing-mutations'
export * from './actions/listings'
export * from './actions/offers'
export * from './actions/messages'
export * from './actions/saves'
export * from './actions/reports'
export * from './actions/seller'
export * from './actions/stripe-connect'
export * from './actions/transactions'
export * from './actions/admin'
export * from './actions/photos'
export * from './actions/shipping'
export * from './actions/maintenance'

// ---------------------------------------------------------------------------
// Lib utilities
// ---------------------------------------------------------------------------

// getFeaturedListings is already re-exported by actions/listings above.
// Alias it here so consumers can use the raw lib version if needed, while
// avoiding a "duplicate export" TS error.
export {
  listingInclude,
  buildWhereClause,
  buildOrderBy,
  getListingBySlug,
  getListingById,
  getListings,
  searchListings,
  getFeaturedListings as getFeaturedListingsQuery,
  getRecentListings,
  getCategoryCounts,
  getTrendingListings,
} from './lib/queries'

export * from './lib/trust'
export * from './lib/shipping'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export * from './types'
