import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExpertPicksAdminForm } from './ExpertPicksAdminForm'

export const metadata = {
  title: 'Expert Picks | Admin',
}

export default async function ExpertPicksAdminPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  await requireAdmin()

  const { eventId } = await params

  const event = await db.fantasyEvent.findUnique({
    where: { id: eventId },
    include: {
      series: { select: { name: true, discipline: true } },
      expertPicks: {
        include: { rider: true },
        orderBy: { slot: 'asc' },
      },
      riderEntries: {
        include: { rider: true },
        orderBy: { basePriceCents: 'desc' },
      },
    },
  })

  if (!event) notFound()

  const publishedPick = event.expertPicks.find(p => p.publishedAt)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/fantasy/events" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Events
        </Link>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {event.series.name} · {event.series.discipline.toUpperCase()}
        </p>
      </div>

      {publishedPick && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-900">
            Published {new Date(publishedPick.publishedAt!).toLocaleString()}
          </p>
        </div>
      )}

      <ExpertPicksAdminForm
        eventId={event.id}
        picks={event.expertPicks}
        riders={event.riderEntries.map(e => e.rider)}
      />
    </div>
  )
}
