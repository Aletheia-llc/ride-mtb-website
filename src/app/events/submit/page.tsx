import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { SubmitEventForm } from '@/modules/events/components/SubmitEventForm'

export const metadata = { title: 'Submit an Event | Ride MTB' }

export default async function SubmitEventPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text)]">Submit an Event</h1>
      <p className="mb-8 text-sm text-[var(--color-text-muted)]">Submit your event for review. We&apos;ll publish it within 24 hours.</p>
      <SubmitEventForm />
    </div>
  )
}
