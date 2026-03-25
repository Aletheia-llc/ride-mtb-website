import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { OrganizerDashboard } from '@/modules/events/components/OrganizerDashboard'

export default async function OrganizerPage() {
  const user = await requireAuth()
  const organizer = await db.organizerProfile.findUnique({
    where: { userId: user.id },
    include: { events: { orderBy: { startDate: 'desc' }, take: 10 } },
  })
  if (!organizer) redirect('/events/organizer/setup')
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Organizer Dashboard</h1>
      <OrganizerDashboard organizer={organizer} />
    </main>
  )
}
