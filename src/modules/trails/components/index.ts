export { DifficultyIndicator } from './DifficultyIndicator'
export { SystemCard } from './SystemCard'
export { TrailList } from './TrailList'
export { TrailDetailView } from './TrailDetail'
export { FavoriteButton } from './FavoriteButton'
export { TrailReviewForm } from './TrailReviewForm'

// TrailMap and TrailMapEmbed are client-only components that import
// mapbox-gl CSS. Consumers must use next/dynamic with { ssr: false }:
//
//   const TrailMap = dynamic(
//     () => import('@/modules/trails/components/TrailMap').then(m => m.TrailMap),
//     { ssr: false }
//   )
export { TrailMap } from './TrailMap'
export { TrailMapEmbed } from './TrailMapEmbed'

// ElevationProfile is a client component using Recharts.
// Must also be dynamically imported with { ssr: false }:
//
//   const ElevationProfile = dynamic(
//     () => import('@/modules/trails/components/ElevationProfile').then(m => m.ElevationProfile),
//     { ssr: false }
//   )
export { ElevationProfile } from './ElevationProfile'
