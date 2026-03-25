import Link from 'next/link'
import { Bike } from 'lucide-react'
import { Button, EmptyState } from '@/ui/components'
import type { UserBikeData } from '../../types/garage'
import { BikeCard } from './BikeCard'

interface GarageViewProps {
  bikes: UserBikeData[]
}

export function GarageView({ bikes }: GarageViewProps) {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">
            My Garage
          </h1>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Manage your bikes and track service history.
          </p>
        </div>
        <Link href="/bikes/garage/new">
          <Button>Add Bike</Button>
        </Link>
      </div>

      {bikes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bikes.map((bike) => (
            <BikeCard key={bike.id} bike={bike} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bike className="h-12 w-12" />}
          title="No bikes in your garage"
          description="Add your first bike to start tracking your rides and service history."
          action={
            <Link href="/bikes/garage/new">
              <Button>Add Your First Bike</Button>
            </Link>
          }
        />
      )}
    </div>
  )
}
