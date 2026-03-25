// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { CalendarView } from '@/modules/events/components/CalendarView'

export default async function EventsCalendarPage() {
  const events = await db.event.findMany({
    where: { status: 'published', startDate: { gte: new Date(Date.now() - 30 * 86400000) } },
    select: { id: true, title: true, slug: true, startDate: true, eventType: true },
    orderBy: { startDate: 'asc' },
    take: 200,
  })
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Event Calendar</h1>
        <a href="/events" className="text-sm text-[var(--color-primary)] hover:underline">List View</a>
      </div>
      <CalendarView events={events} />
    </main>
  )
}
