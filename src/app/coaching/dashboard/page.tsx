import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getCoachByUserId } from '@/modules/coaching/lib/queries'

export const metadata: Metadata = { title: 'Coach Dashboard | Ride MTB' }

export default async function CoachDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const profile = await getCoachByUserId(session.user.id)
  if (!profile) redirect('/coaching/apply')

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Coach Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manage your coaching profile</p>
        </div>
        <Link href={`/coaching/${profile.id}`} className="text-sm text-[var(--color-primary)] hover:underline">View public profile ↗</Link>
      </div>

      {/* Profile summary */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{profile.title}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{profile.bio}</p>

        <div className="flex flex-wrap gap-4 text-sm">
          {profile.hourlyRate && <span className="text-[var(--color-text)]"><strong>${profile.hourlyRate}/hr</strong></span>}
          {profile.location && <span className="text-[var(--color-text-muted)]">📍 {profile.location}</span>}
          {profile.calcomLink && <a href={profile.calcomLink} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">Cal.com booking ↗</a>}
        </div>

        {profile.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.specialties.map(s => (
              <span key={s} className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Cal.com embed info */}
      {profile.calcomLink ? (
        <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
          <h3 className="mb-2 font-semibold text-[var(--color-text)]">Bookings</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Your sessions are managed via Cal.com.
            <a href={profile.calcomLink} target="_blank" rel="noopener noreferrer" className="ml-1 text-[var(--color-primary)] hover:underline">
              Open your Cal.com dashboard ↗
            </a>
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-6">
          <h3 className="mb-2 font-semibold text-yellow-800">Set up booking</h3>
          <p className="text-sm text-yellow-700">
            Add your Cal.com link to let riders book sessions.
            <a href="https://cal.com" target="_blank" rel="noopener noreferrer" className="ml-1 font-medium underline">Create a Cal.com account ↗</a>
          </p>
        </div>
      )}
    </div>
  )
}
