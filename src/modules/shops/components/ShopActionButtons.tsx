'use client'
import type { LeadEventType } from '@/generated/prisma/client'

interface Props {
  shopSlug: string
  phone?: string | null
  websiteUrl?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}

function trackEvent(slug: string, eventType: LeadEventType) {
  fetch(`/api/shops/${slug}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType }),
  }).catch(() => {}) // fire-and-forget
}

export function ShopActionButtons({ shopSlug, phone, websiteUrl, address, city, state }: Props) {
  const mapsQuery = [address, city, state].filter(Boolean).join(', ')
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`

  return (
    <div className="flex flex-wrap gap-3">
      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={() => trackEvent(shopSlug, 'PHONE_CLICK' as LeadEventType)}
          className="btn"
        >
          Call
        </a>
      )}
      {mapsQuery && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent(shopSlug, 'DIRECTIONS_CLICK')}
          className="btn"
        >
          Get Directions
        </a>
      )}
      {websiteUrl && (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent(shopSlug, 'WEBSITE_CLICK')}
          className="btn btn-primary"
        >
          Visit Website
        </a>
      )}
    </div>
  )
}
