import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/ui/components'
import { BikeForm } from '@/modules/bikes'
import { requireAuth } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Add Bike | Ride MTB',
  description: 'Add a new bike to your garage.',
}

export default async function NewBikePage() {
  await requireAuth()

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
        <span className="text-[var(--color-text)]">Add Bike</span>
      </nav>

      <h1 className="mb-6 text-3xl font-bold text-[var(--color-text)]">
        Add a Bike
      </h1>

      <Card>
        <BikeForm />
      </Card>
    </div>
  )
}
