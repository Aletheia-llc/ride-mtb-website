'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { TrailSystemPin } from '../../types'

interface TrailsLayerProps {
  map: mapboxgl.Map
}

export function TrailsLayer({ map }: TrailsLayerProps) {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    fetch('/api/trails/map')
      .then((r) => r.json())
      .then((pins: TrailSystemPin[]) => {
        if (!map || map._removed) return

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: pins.map((p) => ({
            type: 'Feature',
            properties: { id: p.id, slug: p.slug, name: p.name, city: p.city, state: p.state, trailCount: p.trailCount, rating: p.averageRating },
            geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
          })),
        }

        if (map.getSource('trails')) {
          (map.getSource('trails') as mapboxgl.GeoJSONSource).setData(geojson)
          return
        }

        map.addSource('trails', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 12, clusterRadius: 50 })
        map.addLayer({ id: 'trail-clusters', type: 'circle', source: 'trails', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#16a34a', 'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 10, 40], 'circle-opacity': 0.85 } })
        map.addLayer({ id: 'trail-cluster-count', type: 'symbol', source: 'trails', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 14 },
          paint: { 'text-color': '#ffffff' } })
        map.addLayer({ id: 'trail-pins', type: 'circle', source: 'trails', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': '#16a34a', 'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } })

        map.on('click', 'trail-pins', (e) => {
          const feature = e.features?.[0]
          if (!feature?.properties) return
          const { slug, name, city, state, trailCount, rating } = feature.properties
          new mapboxgl.Popup({ offset: 15, maxWidth: '220px' })
            .setHTML(`<div style="font-family:sans-serif;padding:4px 0">
              <strong style="font-size:14px">${name}</strong>
              <div style="font-size:12px;color:#666;margin-top:2px">${city}, ${state}</div>
              <div style="font-size:12px;margin-top:4px">${trailCount} trails${rating ? ` · ★ ${Number(rating).toFixed(1)}` : ''}</div>
              <a href="/trails/explore/${slug}" style="display:block;margin-top:8px;font-size:12px;color:#16a34a">Explore Trails →</a>
            </div>`)
            .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
            .addTo(map)
        })

        map.on('mouseenter', 'trail-pins', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'trail-pins', () => { map.getCanvas().style.cursor = '' })
        map.on('click', 'trail-clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['trail-clusters'] })
          const clusterId = features[0]?.properties?.cluster_id
          if (clusterId != null) {
            (map.getSource('trails') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null) return
              map.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom })
            })
          }
        })
      })
      .catch(console.error)

    return () => {
      if (!map || map._removed) return
      for (const layer of ['trail-clusters', 'trail-cluster-count', 'trail-pins']) {
        if (map.getLayer(layer)) map.removeLayer(layer)
      }
      if (map.getSource('trails')) map.removeSource('trails')
    }
  }, [map])

  return null
}
