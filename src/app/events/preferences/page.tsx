import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getUserEventPreference } from '@/modules/events/lib/queries'

export const metadata = { title: 'Event Preferences | Ride MTB' }

export default async function EventPreferencesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const prefs = await getUserEventPreference(session.user.id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Event Preferences</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        Search radius: {prefs?.searchRadius ?? 100}km
      </p>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Preferences UI coming soon.
      </p>
    </div>
  )
}
