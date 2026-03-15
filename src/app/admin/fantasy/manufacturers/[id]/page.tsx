import { db } from '@/lib/db/client'
import { ManufacturerForm } from '../ManufacturerForm'
import { notFound } from 'next/navigation'

export default async function EditManufacturerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const manufacturer = await db.bikeManufacturer.findUnique({ where: { id } })
  if (!manufacturer) notFound()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <ManufacturerForm manufacturer={manufacturer} />
    </div>
  )
}
