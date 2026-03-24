import { MapPin, Eye, Tag, Package, Truck } from 'lucide-react'
import type { ListingWithPhotos, ListingCategory, FulfillmentType } from '@/modules/marketplace/types'
import { ListingPhotoGallery } from './ListingPhotoGallery'
import { ConditionBadge } from './ConditionBadge'
import { ListingActions } from './ListingActions'

/* ---------- helpers ---------- */

function formatPrice(price: number | string | { toString(): string }): string {
  const num = typeof price === 'number' ? price : parseFloat(String(price))
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

const categoryLabels: Record<ListingCategory, string> = {
  complete_bike: 'Complete Bike',
  frame: 'Frame',
  fork: 'Fork',
  shock: 'Shock',
  wheels: 'Wheels',
  tires: 'Tires',
  drivetrain: 'Drivetrain',
  brakes: 'Brakes',
  cockpit: 'Cockpit',
  saddle_seatpost: 'Saddle & Seatpost',
  pedals: 'Pedals',
  dropper_post: 'Dropper Post',
  helmet: 'Helmet',
  goggles_eyewear: 'Goggles & Eyewear',
  clothing: 'Clothing',
  pack_hydration: 'Pack & Hydration',
  tools: 'Tools',
  electronics: 'Electronics',
  protection: 'Protection',
  rack_transport: 'Rack & Transport',
  vehicle: 'Vehicle',
  other: 'Other',
}

const fulfillmentLabels: Record<FulfillmentType, string> = {
  local_only: 'Local pickup only',
  ship_only: 'Shipping only',
  local_or_ship: 'Local pickup or shipping',
}

const fulfillmentIcons: Record<FulfillmentType, React.ReactNode> = {
  local_only: <Package className="h-4 w-4 text-[var(--color-text-muted)]" />,
  ship_only: <Truck className="h-4 w-4 text-[var(--color-text-muted)]" />,
  local_or_ship: <Truck className="h-4 w-4 text-[var(--color-text-muted)]" />,
}

/* ---------- component ---------- */

interface ListingDetailProps {
  listing: ListingWithPhotos
  initialSaved?: boolean
}

export function ListingDetail({ listing }: ListingDetailProps) {
  const location = [listing.city, listing.state].filter(Boolean).join(', ')

  const specs: { label: string; value: string }[] = []
  if (listing.brand) specs.push({ label: 'Brand', value: listing.brand })
  if (listing.modelName) specs.push({ label: 'Model', value: listing.modelName })
  if (listing.year) specs.push({ label: 'Year', value: String(listing.year) })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ========== Left column ========== */}
        <div className="flex flex-col gap-6">
          {/* Photo gallery */}
          <ListingPhotoGallery photos={listing.photos} />

          {/* Description */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">
              {listing.description}
            </p>
          </section>

          {/* Specs grid */}
          {specs.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">
                Specifications
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                  >
                    <span className="block text-xs text-[var(--color-dim)]">{spec.label}</span>
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {listing.tags.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {listing.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-text-muted)]"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ========== Right column ========== */}
        <div className="flex flex-col gap-4">
          {/* Title */}
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{listing.title}</h1>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-[var(--color-primary)]">
              {formatPrice(listing.price)}
            </span>
            {listing.acceptsOffers && (
              <span className="rounded-full bg-[var(--color-primary-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                OBO
              </span>
            )}
          </div>

          {/* Condition + category badges */}
          <div className="flex flex-wrap items-center gap-2">
            <ConditionBadge condition={listing.condition} />
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
              {categoryLabels[listing.category]}
            </span>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{location}</span>
            </div>
          )}

          {/* View count */}
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-dim)]">
            <Eye className="h-4 w-4 shrink-0" />
            <span>
              {listing.viewCount} {listing.viewCount === 1 ? 'view' : 'views'}
            </span>
          </div>

          {/* Fulfillment info */}
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            {fulfillmentIcons[listing.fulfillment]}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--color-text)]">
                {fulfillmentLabels[listing.fulfillment]}
              </span>
              {listing.shippingCost !== null &&
                listing.shippingCost !== undefined &&
                (listing.fulfillment === 'ship_only' ||
                  listing.fulfillment === 'local_or_ship') && (
                  <span className="text-xs text-[var(--color-dim)]">
                    +{formatPrice(listing.shippingCost)} shipping
                  </span>
                )}
            </div>
          </div>

          {/* Action buttons */}
          <ListingActions
            listingId={listing.id}
            sellerId={listing.sellerId}
            acceptsOffers={listing.acceptsOffers}
            listingPrice={parseFloat(String(listing.price))}
            listingSlug={listing.slug}
          />
        </div>
      </div>
    </div>
  )
}
