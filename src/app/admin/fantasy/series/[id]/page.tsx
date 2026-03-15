import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { SeriesForm } from '../SeriesForm'

export const metadata: Metadata = {
  title: 'Edit Fantasy Series | Admin | Ride MTB',
}

interface EditSeriesPageProps {
  params: Promise<{ id: string }>
}

export default async function EditSeriesPage({ params }: EditSeriesPageProps) {
  const { id } = await params

  const series = await db.fantasySeries.findUnique({
    where: { id },
  })

  if (!series) {
    notFound()
  }

  return <SeriesForm series={series} />
}
