'use client'
import mapboxgl from 'mapbox-gl'
import { FacilityLayer } from './FacilityLayer'

const MOUNTAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`

export function BikeParksLayer({ map }: { map: mapboxgl.Map }) {
  return <FacilityLayer map={map} type="bikeparks" color="#8B5CF6" iconSvg={MOUNTAIN_SVG} />
}
