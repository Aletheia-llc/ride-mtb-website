import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { RiderForm } from '../RiderForm'

interface RiderEditPageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Edit Rider | Admin | Ride MTB',
}

export default async function RiderEditPage({ params }: RiderEditPageProps) {
  const { id } = await params

  const [rider, manufacturers] = await Promise.all([
    db.rider.findUnique({ where: { id } }),
    db.bikeManufacturer.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!rider) notFound()

  return <RiderForm rider={rider} manufacturers={manufacturers} />
}
