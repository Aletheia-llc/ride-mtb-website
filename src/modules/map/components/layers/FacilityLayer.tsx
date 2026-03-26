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
      try {
        const res = await fetch(`/api/facilities?type=${type}`)
        if (!res.ok || cancelled) return
        const pins: FacilityPin[] = await res.json()
        if (cancelled) return

        markersRef.current.forEach((m) => m.remove())
        markersRef.current = []

        const parser = new DOMParser()
        const svgTemplate = parser.parseFromString(iconSvg, 'image/svg+xml').documentElement

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
          const svgEl = svgTemplate.cloneNode(true) as Element
          svgEl.setAttribute('width', '18')
          svgEl.setAttribute('height', '18')
          svgEl.setAttribute('stroke', 'white')
          iconContainer.appendChild(svgEl)
          el.appendChild(iconContainer)

          const TYPE_LABELS: Record<string, string> = {
            SKATEPARK: 'Skatepark',
            PUMPTRACK: 'Pump Track',
            BIKEPARK: 'Bike Park',
          }
          const TYPE_COLORS: Record<string, string> = {
            SKATEPARK: '#f97316',
            PUMPTRACK: '#14b8a6',
            BIKEPARK: '#a855f7',
          }
          const typeColor = TYPE_COLORS[pin.type] ?? color

          const popupEl = document.createElement('div')
          popupEl.style.cssText = 'min-width: 220px; font-family: inherit;'

          // Header: name + type badge
          const header = document.createElement('div')
          header.style.cssText = 'display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px;'
          const nameEl = document.createElement('p')
          nameEl.style.cssText = 'font-weight: 600; font-size: 14px; margin: 0; line-height: 1.3; color: #111827;'
          nameEl.textContent = pin.name
          const badge = document.createElement('span')
          badge.style.cssText = `shrink: 0; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 99px; background: ${typeColor}22; color: ${typeColor}; white-space: nowrap;`
          badge.textContent = TYPE_LABELS[pin.type] ?? pin.type
          header.appendChild(nameEl)
          header.appendChild(badge)
          popupEl.appendChild(header)

          // Location
          if (pin.city || pin.state) {
            const locEl = document.createElement('p')
            locEl.style.cssText = 'font-size: 12px; color: #6b7280; margin: 0 0 6px;'
            locEl.textContent = [pin.city, pin.state].filter(Boolean).join(', ')
            popupEl.appendChild(locEl)
          }

          // Tags row: surface, lit, fee
          const tags = [
            pin.surface,
            pin.lit ? '💡 Lit' : null,
          ].filter(Boolean)
          if (tags.length > 0) {
            const tagsEl = document.createElement('div')
            tagsEl.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;'
            for (const tag of tags) {
              const pill = document.createElement('span')
              pill.style.cssText = 'font-size: 11px; padding: 1px 7px; border-radius: 99px; border: 1px solid #e5e7eb; color: #6b7280; background: #f9fafb; text-transform: capitalize;'
              pill.textContent = tag as string
              tagsEl.appendChild(pill)
            }
            popupEl.appendChild(tagsEl)
          }

          // Rating
          if (pin.reviewCount > 0 && pin.avgRating != null) {
            const ratingEl = document.createElement('p')
            ratingEl.style.cssText = 'font-size: 12px; color: #6b7280; margin: 0 0 8px;'
            ratingEl.textContent = `★ ${pin.avgRating}  (${pin.reviewCount} review${pin.reviewCount !== 1 ? 's' : ''})`
            popupEl.appendChild(ratingEl)
          }

          // Divider + action buttons
          const divider = document.createElement('div')
          divider.style.cssText = 'border-top: 1px solid #e5e7eb; margin: 8px 0 0;'
          popupEl.appendChild(divider)

          const actions = document.createElement('div')
          actions.style.cssText = 'display: flex; gap: 6px; margin-top: 8px;'

          if (pin.stateSlug && pin.slug) {
            const detailLink = document.createElement('a')
            detailLink.href = `/parks/${pin.stateSlug}/${pin.slug}`
            detailLink.style.cssText = `flex: 1; font-size: 12px; font-weight: 600; color: ${typeColor}; text-decoration: none; text-align: center; padding: 6px 0; border-radius: 6px; background: ${typeColor}15;`
            detailLink.textContent = 'Details'
            actions.appendChild(detailLink)
          }

          const mapsLink = document.createElement('a')
          mapsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${pin.latitude},${pin.longitude}`
          mapsLink.target = '_blank'
          mapsLink.rel = 'noopener noreferrer'
          mapsLink.style.cssText = 'flex: 1; font-size: 12px; font-weight: 600; color: #374151; text-decoration: none; text-align: center; padding: 6px 0; border-radius: 6px; background: #f3f4f6; border: 1px solid #e5e7eb;'
          mapsLink.textContent = '↗ Directions'
          actions.appendChild(mapsLink)

          popupEl.appendChild(actions)

          const popup = new mapboxgl.Popup({ offset: 20 }).setDOMContent(popupEl)

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([pin.longitude, pin.latitude])
            .setPopup(popup)
            .addTo(map)

          markersRef.current.push(marker)
        }
      } catch (err) {
        if (!cancelled) {
          console.error(`[FacilityLayer] Failed to load ${type}:`, err)
        }
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
