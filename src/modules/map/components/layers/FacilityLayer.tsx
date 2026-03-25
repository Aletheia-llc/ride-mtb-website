'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { FacilityPin } from '@/modules/parks/types'

interface FacilityLayerProps {
  map: mapboxgl.Map
  type: 'skateparks' | 'pumptracks' | 'bikeparks'
  color: string
  iconSvg: string
}

export function FacilityLayer({ map, type, color, iconSvg }: FacilityLayerProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const res = await fetch(`/api/facilities?type=${type}`)
      if (!res.ok || cancelled) return
      const pins: FacilityPin[] = await res.json()

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      for (const pin of pins) {
        const el = document.createElement('div')
        el.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        `
        const iconContainer = document.createElement('div')
        iconContainer.style.cssText = 'width: 18px; height: 18px; color: white;'
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(iconSvg, 'image/svg+xml')
        const svgEl = svgDoc.documentElement
        svgEl.setAttribute('width', '18')
        svgEl.setAttribute('height', '18')
        svgEl.setAttribute('stroke', 'white')
        iconContainer.appendChild(svgEl)
        el.appendChild(iconContainer)

        const popupEl = document.createElement('div')
        popupEl.style.cssText = 'padding: 8px; min-width: 180px;'

        const nameEl = document.createElement('p')
        nameEl.style.cssText = 'font-weight: 600; margin: 0 0 4px;'
        nameEl.textContent = pin.name
        popupEl.appendChild(nameEl)

        const metaEl = document.createElement('p')
        metaEl.style.cssText = 'font-size: 12px; color: #666; margin: 0 0 4px;'
        const parts = [pin.city, pin.state, pin.surface, pin.lit ? 'Lit' : null].filter(Boolean)
        metaEl.textContent = parts.join(' · ')
        popupEl.appendChild(metaEl)

        if (pin.reviewCount > 0 && pin.avgRating != null) {
          const ratingEl = document.createElement('p')
          ratingEl.style.cssText = 'font-size: 12px; margin: 0 0 6px;'
          ratingEl.textContent = `★ ${pin.avgRating} (${pin.reviewCount} review${pin.reviewCount !== 1 ? 's' : ''})`
          popupEl.appendChild(ratingEl)
        }

        if (pin.stateSlug && pin.slug) {
          const link = document.createElement('a')
          link.href = `/parks/${pin.stateSlug}/${pin.slug}`
          link.style.cssText = 'font-size: 12px; color: var(--color-primary, #16a34a); text-decoration: none;'
          link.textContent = 'View Details →'
          popupEl.appendChild(link)
        }

        const popup = new mapboxgl.Popup({ offset: 20 }).setDOMContent(popupEl)

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([pin.longitude, pin.latitude])
          .setPopup(popup)
          .addTo(map)

        markersRef.current.push(marker)
      }
    }

    load()

    return () => {
      cancelled = true
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [map, type, color, iconSvg])

  return null
}
