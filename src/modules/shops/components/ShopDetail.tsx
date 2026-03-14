import Image from 'next/image'
import { MapPin, Phone, Mail, Globe, Wrench, Tag, Clock } from 'lucide-react'
import { Badge } from '@/ui/components'
import type { ShopDetailData } from '../types'
import { ShopHoursTable } from './ShopHoursTable'
import { ShopReviewSection } from './ShopReviewSection'

interface ShopReview {
  id: string
  overallRating: number
  serviceRating: number
  pricingRating: number
  selectionRating: number
  title: string | null
  body: string
  bikeType: string | null
  helpfulCount: number
  createdAt: Date
  user: { name: string | null }
}

interface ShopDetailProps {
  shop: ShopDetailData
  reviews?: ShopReview[]
}

export function ShopDetail({ shop, reviews = [] }: ShopDetailProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
          {shop.name}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {shop.address}, {shop.city}, {shop.state}
          {shop.zipCode && ` ${shop.zipCode}`}
        </p>
      </div>

      {/* Image */}
      {shop.imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <Image
            src={shop.imageUrl}
            alt={shop.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      )}

      {/* Contact info grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Address */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-4">
          <MapPin className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Address</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {shop.address}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {shop.city}, {shop.state} {shop.zipCode}
            </p>
          </div>
        </div>

        {/* Phone */}
        {shop.phone && (
          <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-4">
            <Phone className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Phone</p>
              <a
                href={`tel:${shop.phone}`}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {shop.phone}
              </a>
            </div>
          </div>
        )}

        {/* Email */}
        {shop.email && (
          <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-4">
            <Mail className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Email</p>
              <a
                href={`mailto:${shop.email}`}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {shop.email}
              </a>
            </div>
          </div>
        )}

        {/* Website */}
        {shop.websiteUrl && (
          <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-4">
            <Globe className="mt-0.5 h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Website</p>
              <a
                href={shop.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {shop.websiteUrl.replace(/^https?:\/\//, '')}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {shop.description && (
        <div>
          <h2 className="mb-3 text-xl font-bold text-[var(--color-text)]">About</h2>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">
            {shop.description}
          </div>
        </div>
      )}

      {/* Services */}
      {shop.services.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">
            <Wrench className="h-5 w-5" />
            Services
          </h2>
          <div className="flex flex-wrap gap-2">
            {shop.services.map((service) => (
              <Badge key={service} variant="info">
                {service}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Brands */}
      {shop.brands.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">
            <Tag className="h-5 w-5" />
            Brands
          </h2>
          <div className="flex flex-wrap gap-2">
            {shop.brands.map((brand) => (
              <Badge key={brand} variant="default">
                {brand}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Hours */}
      {shop.hoursJson != null && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">
            <Clock className="h-5 w-5" />
            Hours
          </h2>
          <ShopHoursTable hoursJson={shop.hoursJson as Record<string, { open: string; close: string; closed?: boolean }>} />
        </div>
      )}

      {/* Map placeholder */}
      {shop.latitude && shop.longitude && (
        <div>
          <h2 className="mb-3 text-xl font-bold text-[var(--color-text)]">Location</h2>
          <div className="flex h-64 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              Map coming soon
            </p>
          </div>
        </div>
      )}

      {/* Reviews */}
      <ShopReviewSection
        shopId={shop.id}
        reviews={reviews}
        avgOverall={shop.avgOverallRating ?? null}
        reviewCount={shop.reviewCount ?? 0}
      />
    </div>
  )
}
