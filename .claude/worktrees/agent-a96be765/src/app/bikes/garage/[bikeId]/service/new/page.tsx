import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/ui/components'
import { ServiceLogForm } from '@/modules/bikes'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { getUserBikeById } from '@/modules/bikes/lib/garage-queries'

interface Props {
  params: Promise<{ bikeId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bikeId } = await params
  const user = await requireAuth()
  const bike = await getUserBikeById(bikeId, user.id)

  if (!bike) {
    return { title: 'Bike Not Found | Ride MTB' }
  }

  return {
    title: `Log Service — ${bike.name} | Ride MTB`,
    description: `Add a service entry for ${bike.name}.`,
  }
}

export default async function NewServiceLogPage({ params }: Props) {
  const { bikeId } = await params
  const user = await requireAuth()
  const bike = await getUserBikeById(bikeId, user.id)

  if (!bike) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/bikes/garage"
          className="transition-colors hover:text-[var(--color-text)]"
        >
          My Garage
        </Link>
        <span>/</span>
        <Link
          href={`/bikes/garage/${bike.id}`}
          className="transition-colors hover:text-[var(--color-text)]"
        >
          {bike.name}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Log Service</span>
      </nav>

      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        Log Service
      </h1>
      <p className="mb-6 text-[var(--color-text-muted)]">
        Record maintenance, repairs, or upgrades for {bike.name}.
      </p>

      <Card>
        <ServiceLogForm bikeId={bike.id} />
      </Card>
    </div>
  )
}
