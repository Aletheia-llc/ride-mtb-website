import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getCoachByUserId, getMyClinics } from '@/modules/coaching/lib/queries'

export const metadata: Metadata = { title: 'My Clinics | Coach Dashboard | Ride MTB' }

export default async function DashboardClinicsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const coachProfile = await getCoachByUserId(session.user.id)

  if (!coachProfile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-[var(--color-text)]">No Coach Profile</h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          You need a coach profile to manage clinics.
        </p>
        <Link
          href="/coaching/apply"
          className="inline-block rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          Apply to Become a Coach
        </Link>
      </div>
    )
  }

  const clinics = await getMyClinics(coachProfile.id)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">My Clinics</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manage your coaching clinics</p>
        </div>
        <Link
          href="/coaching/dashboard/clinics/new"
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          + New Clinic
        </Link>
      </div>

      {clinics.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            You haven&apos;t created any clinics yet.
          </p>
          <Link
            href="/coaching/dashboard/clinics/new"
            className="mt-4 inline-block text-sm text-[var(--color-primary)] hover:underline"
          >
            Create your first clinic
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text)]">Title</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text)]">Date</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text)]">Status</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-bg)]">
              {clinics.map((clinic) => (
                <tr key={clinic.id}>
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                    <Link
                      href={`/coaching/clinics/${clinic.slug}`}
                      className="hover:text-[var(--color-primary)] hover:underline"
                    >
                      {clinic.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {clinic.startDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)] capitalize">
                      {clinic.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/coaching/dashboard/clinics/${clinic.id}/edit`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
