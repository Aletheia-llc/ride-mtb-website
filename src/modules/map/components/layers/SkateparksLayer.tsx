'use client'
import mapboxgl from 'mapbox-gl'
import { FacilityLayer } from './FacilityLayer'

const ZAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`

export function SkateparksLayer({ map }: { map: mapboxgl.Map }) {
  return <FacilityLayer map={map} type="skateparks" color="#F97316" iconSvg={ZAP_SVG} />
}
