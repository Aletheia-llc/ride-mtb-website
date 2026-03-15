import { auth } from '@/lib/auth'
import { getSeriesHub } from '@/modules/fantasy/queries/getSeriesHub'
import { getManufacturerPick } from '@/modules/fantasy/queries/getManufacturerPick'
import { notFound } from 'next/navigation'
import Image from 'next/image'

export default async function TeamSelectionPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  const seriesData = await getSeriesHub(series)
  if (!seriesData) notFound()

  const session = await auth()
  const userId = session?.user?.id ?? null

  const manufacturerPick = userId
    ? await getManufacturerPick(userId, seriesData.id, seriesData.season)
    : null

  return (
    <div className="py-6">
      <h1 className="text-xl font-bold mb-6">Build Your Team</h1>

      {manufacturerPick && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-lg px-3 py-2 mb-6">
          {manufacturerPick.manufacturer.logoUrl && (
            <Image
              src={manufacturerPick.manufacturer.logoUrl}
              alt=""
              width={20}
              height={20}
              className="rounded"
              unoptimized
            />
          )}
          <span>
            <span className="font-medium text-[var(--color-text)]">{manufacturerPick.manufacturer.name}</span>
            {' '}· Manufacturer Cup · {manufacturerPick.seasonTotal} pts
          </span>
        </div>
      )}

      <p className="text-[var(--color-text-muted)] text-sm">
        Select an open event from the{' '}
        <a href={`/fantasy/${series}`} className="text-green-600 underline">series hub</a>
        {' '}to build your team.
      </p>
    </div>
  )
}
