import Link from 'next/link'
import { auth } from '@/lib/auth/config'
import { getUserEventPreference } from '@/modules/events/lib/queries'

export const metadata = { title: 'Events Near Me | Ride MTB' }

export default async function NearMePage() {
  const session = await auth()
  const prefs = session?.user?.id ? await getUserEventPreference(session.user.id) : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-[var(--color-text)]">Events Near Me</h1>
      {!prefs?.homeLatitude ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          Set your home location in <Link href="/events/preferences" className="text-[var(--color-primary)] hover:underline">preferences</Link> to find events near you.
        </p>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Loading events within {prefs.searchRadius}km…</p>
      )}
    </div>
  )
}
