'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { CoachPin, ClinicPin } from '../../types'

interface CoachesLayerProps {
  map: mapboxgl.Map
}

export function CoachesLayer({ map }: CoachesLayerProps) {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    fetch('/api/coaching/map')
      .then((r) => r.json())
      .then(({ coaches, clinics }: { coaches: CoachPin[]; clinics: ClinicPin[] }) => {
        if (!map || map._removed) return

        // Coach profile pins
        const coachGeojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: coaches.map((c) => ({
            type: 'Feature',
            properties: {
              id: c.id,
              name: c.name,
              specialties: JSON.stringify(c.specialties),
              hourlyRate: c.hourlyRate ?? null,
              calcomLink: c.calcomLink ?? null,
            },
            geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
          })),
        }

        if (map.getSource('coach-profiles')) {
          (map.getSource('coach-profiles') as mapboxgl.GeoJSONSource).setData(coachGeojson)
        } else {
          map.addSource('coach-profiles', { type: 'geojson', data: coachGeojson })
          map.addLayer({
            id: 'coach-pins',
            type: 'circle',
            source: 'coach-profiles',
            paint: {
              'circle-color': '#16a34a',
              'circle-radius': 9,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          })

          map.on('click', 'coach-pins', (e) => {
            const feature = e.features?.[0]
            if (!feature?.properties) return
            const { name, specialties, hourlyRate, calcomLink } = feature.properties
            const parsedSpecialties: string[] = JSON.parse(specialties || '[]')
            const rateStr = hourlyRate ? `$${hourlyRate}/hr` : 'Free consultation'
            const calLink = calcomLink
              ? `<a href="${calcomLink}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:8px;font-size:12px;color:#16a34a">Book a Session →</a>`
              : ''
            new mapboxgl.Popup({ offset: 15, maxWidth: '240px' })
              .setHTML(`<div style="font-family:sans-serif;padding:4px 0">
                <strong style="font-size:14px">${name}</strong>
                ${parsedSpecialties.length ? `<div style="font-size:12px;color:#666;margin-top:4px">${parsedSpecialties.join(', ')}</div>` : ''}
                <div style="font-size:12px;margin-top:4px">${rateStr}</div>
                ${calLink}
              </div>`)
              .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
              .addTo(map)
          })
          map.on('mouseenter', 'coach-pins', () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', 'coach-pins', () => { map.getCanvas().style.cursor = '' })
        }

        // Clinic pins
        const clinicGeojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: clinics.map((c) => ({
            type: 'Feature',
            properties: {
              id: c.id,
              slug: c.slug,
              title: c.title,
              startDate: c.startDate,
              costCents: c.costCents ?? null,
              isFree: c.isFree,
              calcomLink: c.calcomLink ?? null,
              coachName: c.coachName,
            },
            geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] },
          })),
        }

        if (map.getSource('coaching-clinics')) {
          (map.getSource('coaching-clinics') as mapboxgl.GeoJSONSource).setData(clinicGeojson)
        } else {
          map.addSource('coaching-clinics', { type: 'geojson', data: clinicGeojson })
          map.addLayer({
            id: 'clinic-pins',
            type: 'circle',
            source: 'coaching-clinics',
            paint: {
              'circle-color': '#3b82f6',
              'circle-radius': 9,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          })

          map.on('click', 'clinic-pins', (e) => {
            const feature = e.features?.[0]
            if (!feature?.properties) return
            const { slug, title, startDate, costCents, isFree, calcomLink, coachName } = feature.properties
            const dateStr = new Date(startDate).toLocaleDateString()
            const costStr = isFree ? 'Free' : costCents ? `$${(costCents / 100).toFixed(0)}` : 'Paid'
            const calLink = calcomLink
              ? `<a href="${calcomLink}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:8px;font-size:12px;color:#3b82f6">Register →</a>`
              : `<a href="/coaching/clinics/${slug}" style="display:block;margin-top:8px;font-size:12px;color:#3b82f6">View Clinic →</a>`
            new mapboxgl.Popup({ offset: 15, maxWidth: '240px' })
              .setHTML(`<div style="font-family:sans-serif;padding:4px 0">
                <strong style="font-size:14px">${title}</strong>
                <div style="font-size:12px;color:#666;margin-top:2px">with ${coachName}</div>
                <div style="font-size:12px;margin-top:4px">${dateStr} · ${costStr}</div>
                ${calLink}
              </div>`)
              .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
              .addTo(map)
          })
          map.on('mouseenter', 'clinic-pins', () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', 'clinic-pins', () => { map.getCanvas().style.cursor = '' })
        }
      })
      .catch(console.error)

    return () => {
      if (!map || map._removed) return
      for (const layer of ['coach-pins', 'clinic-pins']) {
        if (map.getLayer(layer)) map.removeLayer(layer)
      }
      for (const source of ['coach-profiles', 'coaching-clinics']) {
        if (map.getSource(source)) map.removeSource(source)
      }
    }
  }, [map])

  return null
}
