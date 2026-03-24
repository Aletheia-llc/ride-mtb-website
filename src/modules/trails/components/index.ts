export { DifficultyIndicator } from './DifficultyIndicator'
export { SystemCard } from './SystemCard'
export { TrailList } from './TrailList'
export { TrailDetailView } from './TrailDetail'
export { FavoriteButton } from './FavoriteButton'
export { TrailReviewForm } from './TrailReviewForm'
export { ConditionBadge } from './ConditionBadge'
export { ConditionReportForm } from './ConditionReportForm'
export { TrailCompareView } from './TrailCompareView'

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

// Pre-wrapped dynamic imports (safe for Server Components)
export { TrailMapDynamic } from './TrailMapDynamic'
export { ElevationProfileDynamic } from './ElevationProfileDynamic'

export { MapStyleSelector } from './MapStyleSelector'
export type { MapStyle } from './MapStyleSelector'
export { TrailLines } from './TrailLines'
export type { TrailLineData } from './TrailLines'
export { SystemClusterMap } from './SystemClusterMap'
export { SystemClusterMapDynamic } from './SystemClusterMapDynamic'

export { TrailCard } from './TrailCard'
export { DifficultyDistribution } from './DifficultyDistribution'
export { RadarChart } from './RadarChart'
export { PhotoGallery } from './PhotoGallery'
export { GetDirectionsButton } from './GetDirectionsButton'
export { ShareButton } from './ShareButton'
export { HelpfulButton } from './HelpfulButton'
export { TrailViewTracker } from './TrailViewTracker'
export { GpxUploadForm } from './GpxUploadForm'
