import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getUserEventPreference } from '@/modules/events/lib/queries'
// eslint-disable-next-line no-restricted-imports
import { EventPreferencesForm } from '@/modules/events/components/EventPreferencesForm'

export const metadata = { title: 'Event Preferences | Ride MTB' }

export default async function EventPreferencesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const prefs = await getUserEventPreference(session.user.id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text)]">Event Preferences</h1>
      <p className="mb-8 text-sm text-[var(--color-text-muted)]">
        Customize which events you see and how you&apos;re notified.
      </p>
      <EventPreferencesForm
        initialPrefs={
          prefs
            ? {
                searchRadius: prefs.searchRadius,
                followedTypes: prefs.followedTypes,
                newEventAlerts: prefs.newEventAlerts,
                reminderDays: prefs.reminderDays,
                resultsAlerts: prefs.resultsAlerts,
                homeLatitude: prefs.homeLatitude ? Number(prefs.homeLatitude) : null,
                homeLongitude: prefs.homeLongitude ? Number(prefs.homeLongitude) : null,
              }
            : null
        }
      />
    </div>
  )
}
