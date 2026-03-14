'use client'
import { useEffect, useRef } from 'react'

export interface ShopPin {
  id: string
  name: string
  slug: string
  latitude: number | null
  longitude: number | null
  shopType: string
  partnerTier: string
  avgOverallRating: number | null
  reviewCount: number
}

export function ShopsMapClient({ shops }: { shops: ShopPin[] }) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token || !mapRef.current) return

    let map: unknown = null
    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = token
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map = new (mapboxgl.default as any).Map({
        container: mapRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-105, 39],
        zoom: 4,
      })

      shops.filter(s => s.latitude && s.longitude).forEach((shop) => {
        const el = document.createElement('div')
        el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid white;cursor:pointer'
        el.title = shop.name

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const popup = new (mapboxgl.default as any).Popup({ offset: 10 }).setHTML(
          `<a href="/shops/${shop.slug}" style="font-weight:600;font-size:14px">${shop.name}</a>` +
          (shop.avgOverallRating ? `<p style="font-size:12px;color:#666;margin:4px 0 0">${shop.avgOverallRating.toFixed(1)}★ (${shop.reviewCount})</p>` : '')
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (mapboxgl.default as any).Marker(el)
          .setLngLat([shop.longitude!, shop.latitude!])
          .setPopup(popup)
          .addTo(map as object)
      })
    })

    return () => {
      if (map) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).remove()
      }
    }
  }, [shops])

  return <div ref={mapRef} className="w-full h-full" />
}
