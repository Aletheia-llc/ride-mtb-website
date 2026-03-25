import { MapPin, Eye, Tag, Package, Truck, Bookmark, Calendar } from 'lucide-react'
import type { ListingWithPhotos, ListingCategory, FulfillmentType } from '@/modules/marketplace/types'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { listingInclude } from '@/modules/marketplace/lib/queries'
import type { ListingWithPhotos as LWP } from '@/modules/marketplace/types'
import { ListingPhotoGallery } from './ListingPhotoGallery'
import { ConditionBadge } from './ConditionBadge'
import { ListingActions } from './ListingActions'
import { ShareButton } from './ShareButton'
import { SellerCard } from '../seller/SellerCard'
import { SaveButton } from '../ui/SaveButton'
import { ReportButton } from '../ui/ReportButton'
import { ListingCard } from './ListingCard'

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

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
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
}

export async function ListingDetail({ listing }: ListingDetailProps) {
  const location = [listing.city, listing.state].filter(Boolean).join(', ')

  // Item specifics grid data
  const specs: { label: string; value: string }[] = [
    { label: 'Category', value: categoryLabels[listing.category] },
    ...(['new', 'like_new', 'good', 'fair', 'poor'].includes(listing.condition)
      ? [{ label: 'Condition', value: listing.condition.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }]
      : []),
    ...(listing.brand ? [{ label: 'Brand', value: listing.brand }] : []),
    ...(listing.modelName ? [{ label: 'Model', value: listing.modelName }] : []),
    ...(listing.year ? [{ label: 'Year', value: String(listing.year) }] : []),
    ...(listing.frameSize ? [{ label: 'Frame Size', value: listing.frameSize }] : []),
    ...(listing.wheelSize ? [{ label: 'Wheel Size', value: listing.wheelSize }] : []),
    ...(listing.frameMaterial ? [{ label: 'Material', value: listing.frameMaterial }] : []),
    ...(listing.forkTravel ? [{ label: 'Fork Travel', value: `${listing.forkTravel}mm` }] : []),
    ...(listing.rearTravel ? [{ label: 'Rear Travel', value: `${listing.rearTravel}mm` }] : []),
    ...(listing.sellerType === 'shop' ? [{ label: 'Seller', value: 'Shop / Dealer' }] : []),
    ...(listing.acceptsTrades ? [{ label: 'Trades', value: 'Open to trades' }] : []),
  ]

  // Check if current user has saved this listing
  const session = await auth()
  const userId = session?.user?.id
  let initialSaved = false
  if (userId) {
    const save = await db.listingSave.findUnique({
      where: { userId_listingId: { userId, listingId: listing.id } },
      select: { id: true },
    })
    initialSaved = save !== null
  }

  // Related listings (same category, excluding this one)
  const relatedRaw = await db.listing.findMany({
    where: {
      status: 'active',
      category: listing.category,
      NOT: { id: listing.id },
    },
    include: listingInclude,
    orderBy: { createdAt: 'desc' },
    take: 4,
  })
  const related = relatedRaw as LWP[]

  const isSold = listing.status === 'sold'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">

      {/* ===== SOLD BANNER ===== */}
      {isSold && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-4">
          <span className="inline-block rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            Sold
          </span>
          <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
            This item has been marked as sold. It is no longer available.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ========== Left column ========== */}
        <div className="flex flex-col gap-6">

          {/* Photo gallery */}
          <ListingPhotoGallery photos={listing.photos} />

          {/* Title */}
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{listing.title}</h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[var(--color-dim)]">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Posted {formatDate(listing.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {listing.viewCount} {listing.viewCount === 1 ? 'view' : 'views'}
            </span>
            <span className="flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />
              {listing.saveCount} {listing.saveCount === 1 ? 'watcher' : 'watchers'}
            </span>
            {location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
          </div>

          {/* Item Specifics */}
          {specs.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">
                Item Specifics
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

          {/* Description */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">
              {listing.description}
            </p>
          </section>

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

          {/* Related listings */}
          {related.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
                More in {categoryLabels[listing.category]}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {related.map((r) => (
                  <ListingCard key={r.id} listing={r} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ========== Right column (sticky sidebar) ========== */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold ${isSold ? 'text-[var(--color-dim)] line-through' : 'text-[var(--color-primary)]'}`}
            >
              {formatPrice(listing.price)}
            </span>
            {isSold && (
              <span className="text-sm font-medium text-[var(--color-dim)]">(SOLD)</span>
            )}
            {listing.acceptsOffers && !isSold && (
              <span className="rounded-full bg-[var(--color-primary-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                OBO
              </span>
            )}
            {listing.acceptsTrades && !isSold && (
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
                Trades OK
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

          {/* Primary action (Message / Edit) */}
          <ListingActions
            listingId={listing.id}
            sellerId={listing.sellerId}
            acceptsOffers={listing.acceptsOffers}
            listingPrice={parseFloat(String(listing.price))}
            listingSlug={listing.slug}
          />

          {/* Fulfillment */}
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

          {/* Save / Share / Report action row */}
          <div className="flex items-center gap-2">
            <SaveButton
              listingId={listing.id}
              initialSaved={initialSaved}
              saveCount={listing.saveCount}
              variant="detail"
            />
            <ShareButton slug={listing.slug} title={listing.title} />
            <ReportButton listingId={listing.id} />
          </div>

          {/* Seller card */}
          <SellerCard seller={listing.seller} />
        </div>
      </div>
    </div>
  )
}
