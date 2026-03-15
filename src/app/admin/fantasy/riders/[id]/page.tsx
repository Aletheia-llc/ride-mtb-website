import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { RiderForm } from '../RiderForm'

export const metadata: Metadata = {
  title: 'Edit Rider | Admin | Ride MTB',
}

interface EditRiderPageProps {
  params: Promise<{ id: string }>
}

export default async function EditRiderPage({ params }: EditRiderPageProps) {
  const { id } = await params

  const rider = await db.rider.findUnique({
    where: { id },
  })

  if (!rider) {
    notFound()
  }

  return <RiderForm rider={rider} />
}
