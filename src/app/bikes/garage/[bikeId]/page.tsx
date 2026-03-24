import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, Badge } from '@/ui/components'
import { BikeForm, ServiceLogList, DeleteBikeButton } from '@/modules/bikes'
import { ComponentTable } from '@/modules/bikes/components/ComponentTable'
import { BuildLogTimeline } from '@/modules/bikes/components/BuildLogTimeline'
import { MaintenanceList } from '@/modules/bikes/components/MaintenanceList'
import { BikeTabs } from '@/modules/bikes/components/garage/BikeTabs'
import { WeightBreakdown } from '@/modules/bikes/components/garage/WeightBreakdown'
import { CostSummaryCard } from '@/modules/bikes/components/garage/CostSummaryCard'
import { ShareButton } from '@/modules/bikes/components/garage/ShareButton'
import { DuplicateBikeButton } from '@/modules/bikes/components/garage/DuplicateBikeButton'
import { ExportImportSection } from '@/modules/bikes/components/garage/ExportImportSection'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports -- server component, direct module import is intentional
import { getBikeWithDetails } from '@/modules/bikes/lib/garage-queries'
import type { BikeCategory } from '@/modules/bikes'

const categoryBadgeVariant: Record<BikeCategory, 'default' | 'success' | 'info' | 'warning' | 'error'> = {
  gravel: 'default',
  xc: 'success',
  trail: 'info',
  enduro: 'warning',
  downhill: 'error',
  dirt_jump: 'default',
  ebike: 'info',
  other: 'default',
}

const categoryLabel: Record<BikeCategory, string> = {
  gravel: 'Gravel',
  xc: 'XC',
  trail: 'Trail',
  enduro: 'Enduro',
  downhill: 'Downhill',
  dirt_jump: 'Dirt Jump',
  ebike: 'E-Bike',
  other: 'Other',
}

interface Props {
  params: Promise<{ bikeId: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bikeId } = await params
  const user = await requireAuth()
  const bike = await getBikeWithDetails(bikeId, user.id)

  if (!bike) {
    return { title: 'Bike Not Found | Ride MTB' }
  }

  return {
    title: `${bike.name} | Ride MTB`,
    description: `${bike.brand} ${bike.model} — service history and details.`,
  }
}

export default async function BikeDetailPage({ params, searchParams }: Props) {
  const { bikeId } = await params
  const { tab = 'overview' } = await searchParams
  const user = await requireAuth()
  const bike = await getBikeWithDetails(bikeId, user.id)

  if (!bike) {
    notFound()
  }

  const yearDisplay = bike.year ? `${bike.year} ` : ''

  // Compute cost and weight data for overview tab
  const activeComponents = bike.components.filter(c => c.isActive)
  const componentCostDollars = activeComponents.reduce((sum, c) => sum + (c.priceCents ?? 0), 0) / 100
  const purchasePriceDollars = bike.purchasePrice ?? 0

  // Group component weights by category
  const categoryWeightMap = new Map<string, number>()
  for (const c of activeComponents) {
    if (c.weightGrams) {
      categoryWeightMap.set(
        c.category,
        (categoryWeightMap.get(c.category) ?? 0) + c.weightGrams,
      )
    }
  }
  const categoryWeights = Array.from(categoryWeightMap.entries()).map(([category, weightGrams]) => ({
    category,
    weightGrams,
  }))
  const totalWeightGrams = categoryWeights.reduce((sum, cw) => sum + cw.weightGrams, 0)

  // Category breakdown for cost card
  const categoryBreakdownMap = new Map<string, number>()
  for (const c of activeComponents) {
    if (c.priceCents != null) {
      categoryBreakdownMap.set(
        c.category,
        (categoryBreakdownMap.get(c.category) ?? 0) + c.priceCents / 100,
      )
    }
  }
  const categoryBreakdown = Array.from(categoryBreakdownMap.entries()).map(([category, totalDollars]) => ({
    category,
    totalDollars,
  }))
  const costComponentCount = activeComponents.filter(c => c.priceCents != null).length

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/bikes/garage"
          className="transition-colors hover:text-[var(--color-text)]"
        >
          My Garage
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{bike.name}</span>
      </nav>

      {/* Bike header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[var(--color-text)]">
              {bike.name}
            </h1>
            {bike.isPrimary && <Badge variant="gold">Primary</Badge>}
          </div>
          <p className="mt-1 text-[var(--color-text-muted)]">
            {yearDisplay}{bike.brand} {bike.model}
          </p>
        </div>
        <Badge variant={categoryBadgeVariant[bike.category as BikeCategory]}>
          {categoryLabel[bike.category as BikeCategory]}
        </Badge>
      </div>

      {/* Bike image */}
      {bike.imageUrl && (
        <Card className="mb-8 overflow-hidden p-0">
          <Image
            src={bike.imageUrl}
            alt={bike.name}
            width={800}
            height={256}
            className="h-64 w-full object-cover"
            unoptimized
          />
        </Card>
      )}

      {/* Tabs */}
      <BikeTabs bikeId={bike.id} activeTab={tab} />

      {/* Tab content */}
      <div className="mt-6">
        {tab === 'overview' && (
          <>
            {/* Bike details */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {bike.wheelSize && (
                <Card>
                  <p className="text-xs text-[var(--color-text-muted)]">Wheel Size</p>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{bike.wheelSize}</p>
                </Card>
              )}
              {bike.frameSize && (
                <Card>
                  <p className="text-xs text-[var(--color-text-muted)]">Frame Size</p>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{bike.frameSize}</p>
                </Card>
              )}
              {bike.weight != null && (
                <Card>
                  <p className="text-xs text-[var(--color-text-muted)]">Weight</p>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{bike.weight} lbs</p>
                </Card>
              )}
              {bike.travel != null && (
                <Card>
                  <p className="text-xs text-[var(--color-text-muted)]">Travel</p>
                  <p className="mt-1 font-medium text-[var(--color-text)]">{bike.travel}mm</p>
                </Card>
              )}
              <Card>
                <p className="text-xs text-[var(--color-text-muted)]">Service Entries</p>
                <p className="mt-1 font-medium text-[var(--color-text)]">{bike.serviceLogs.length}</p>
              </Card>
            </div>

            {/* Cost summary */}
            {purchasePriceDollars + componentCostDollars > 0 && (
              <div className="mb-6">
                <CostSummaryCard
                  purchasePriceDollars={purchasePriceDollars}
                  componentCostDollars={componentCostDollars}
                  componentCount={costComponentCount}
                  categoryBreakdown={categoryBreakdown}
                />
              </div>
            )}

            {/* Weight breakdown */}
            {categoryWeights.length > 0 && (
              <div className="mb-6">
                <WeightBreakdown
                  categoryWeights={categoryWeights}
                  totalWeightGrams={totalWeightGrams}
                />
              </div>
            )}

            {/* Export / Import */}
            <div className="mb-8">
              <ExportImportSection bikeId={bike.id} />
            </div>

            {/* Notes */}
            {bike.notes && (
              <div className="mb-8">
                <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Notes</h2>
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{bike.notes}</p>
              </div>
            )}

            {/* Recent service history */}
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-[var(--color-text)]">
                  Recent Service
                </h2>
                <Link
                  href={`/bikes/garage/${bike.id}/service/new`}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
                >
                  Log Service
                </Link>
              </div>
              <ServiceLogList logs={bike.serviceLogs} bikeId={bike.id} />
            </section>

            {/* Edit form */}
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
                Edit Bike
              </h2>
              <Card>
                <BikeForm bike={bike} />
              </Card>
            </section>

            {/* Actions */}
            <section className="mb-8">
              <div className="flex flex-wrap gap-2">
                <ShareButton />
                <DuplicateBikeButton bikeId={bike.id} />
              </div>
            </section>

            {/* Sell this bike */}
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
                Ready to Sell?
              </h2>
              <Card>
                <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                  Create a marketplace listing pre-filled with this bike&apos;s details.
                </p>
                <Link
                  href={`/marketplace/sell?fromBike=${bike.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
                >
                  Sell This Bike
                </Link>
              </Card>
            </section>

            {/* Danger zone */}
            <section>
              <h2 className="mb-4 text-xl font-bold text-red-600">
                Danger Zone
              </h2>
              <Card className="border-red-200">
                <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                  Permanently delete this bike and all its service history. This action cannot be undone.
                </p>
                <DeleteBikeButton bikeId={bike.id} />
              </Card>
            </section>
          </>
        )}

        {tab === 'components' && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">Components</h2>
            <ComponentTable bikeId={bike.id} components={bike.components} />
          </section>
        )}

        {tab === 'build-log' && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">Build Log</h2>
            <BuildLogTimeline bikeId={bike.id} entries={bike.buildLog} />
          </section>
        )}

        {tab === 'maintenance' && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">Maintenance</h2>
            <MaintenanceList tasks={bike.maintenanceTasks} />
          </section>
        )}
      </div>
    </div>
  )
}
