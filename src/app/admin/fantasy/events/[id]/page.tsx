import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AddRiderToEventForm } from './AddRiderToEventForm'

export const metadata = {
  title: 'Manage Event | Admin',
}

export default async function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin()

  // Handle new event page
  if (id === 'new') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
        <p className="text-[var(--color-text-muted)]">Create event form — coming soon</p>
      </div>
    )
  }

  // Fetch event with relations
  const event = await db.fantasyEvent.findUnique({
    where: { id: id },
    include: {
      series: true,
      riderEntries: {
        include: { rider: true },
        orderBy: { basePriceCents: 'desc' },
      },
    },
  })

  if (!event) {
    notFound()
  }

  // Fetch all riders for this discipline
  const allRiders = await db.rider.findMany({
    where: { disciplines: { has: event.series.discipline } },
    orderBy: { name: 'asc' },
  })

  // Get riders already in the event
  const enteredRiderIds = new Set(event.riderEntries.map(e => e.riderId))
  const availableRiders = allRiders.filter(r => !enteredRiderIds.has(r.id))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/admin/fantasy/events" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Events
          </Link>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Race: {new Date(event.raceDate).toLocaleDateString()} · Deadline:{' '}
            {new Date(event.rosterDeadline).toLocaleDateString()} · Status: <span className="font-mono font-semibold">{event.status}</span>
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {event.series.name} ({event.series.discipline.toUpperCase()}) · {event.location}, {event.country}
          </p>
        </div>
      </div>

      {/* Add Rider Section */}
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add Rider to Event</h2>
        {availableRiders.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">All riders in this discipline are already entered.</p>
        ) : (
          <AddRiderToEventForm eventId={event.id} riders={availableRiders} />
        )}
      </div>

      {/* Entered Riders Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Entered Riders ({event.riderEntries.length})</h2>
        {event.riderEntries.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No riders entered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left">
                  <th className="py-3 pr-4 font-semibold">Rider</th>
                  <th className="py-3 pr-4 font-semibold">Nationality</th>
                  <th className="py-3 pr-4 font-semibold">Base Price</th>
                  <th className="py-3 pr-4 font-semibold">Market Price</th>
                  <th className="py-3 font-semibold">Ownership</th>
                </tr>
              </thead>
              <tbody>
                {event.riderEntries.map(entry => (
                  <tr key={entry.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]">
                    <td className="py-3 pr-4 font-medium">{entry.rider.name}</td>
                    <td className="py-3 pr-4 text-[var(--color-text-muted)]">{entry.rider.nationality}</td>
                    <td className="py-3 pr-4 font-mono">${(entry.basePriceCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 pr-4 font-mono">${(entry.marketPriceCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 font-mono text-[var(--color-text-muted)]">
                      {entry.ownershipPct ? `${(entry.ownershipPct * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
