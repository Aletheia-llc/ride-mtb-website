import type { Metadata } from 'next'
import { db } from '@/lib/db/client'
import { RiderForm } from '../RiderForm'

export const metadata: Metadata = {
  title: 'New Rider | Admin | Ride MTB',
}

export default async function NewRiderPage() {
  const manufacturers = await db.bikeManufacturer.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return <RiderForm manufacturers={manufacturers} />
}
