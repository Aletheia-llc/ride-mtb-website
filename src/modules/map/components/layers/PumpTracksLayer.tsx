'use client'
import mapboxgl from 'mapbox-gl'
import { FacilityLayer } from './FacilityLayer'

const BIKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 0 0-1-1h-1"/><path d="M15 6l-3 9-3-3-3 3"/><path d="M9 9h5.5l.5 3"/></svg>`

export function PumpTracksLayer({ map }: { map: mapboxgl.Map }) {
  return <FacilityLayer map={map} type="pumptracks" color="#14B8A6" iconSvg={BIKE_SVG} />
}
