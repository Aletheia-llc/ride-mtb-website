'use client'
import mapboxgl from 'mapbox-gl'
import { FacilityLayer } from './FacilityLayer'

const SHOP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/><path d="M17 17H6V3H4"/><path d="m6 13 10-1 1-6H5"/></svg>`

export function BikeShopsLayer({ map }: { map: mapboxgl.Map }) {
  return <FacilityLayer map={map} type="bikeshops" color="#ec4899" iconSvg={SHOP_SVG} />
}
