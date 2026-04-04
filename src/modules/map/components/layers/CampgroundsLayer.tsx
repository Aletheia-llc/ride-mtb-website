'use client'
import mapboxgl from 'mapbox-gl'
import { FacilityLayer } from './FacilityLayer'

// Tent icon
const TENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20L12 4l9 16"/><path d="M3 20h18"/><path d="m9 20 3-6 3 6"/></svg>`

export function CampgroundsLayer({ map }: { map: mapboxgl.Map }) {
  return <FacilityLayer map={map} type="campgrounds" color="#78716c" iconSvg={TENT_SVG} />
}
