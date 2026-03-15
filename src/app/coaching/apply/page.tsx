import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getMyCoachApplication } from '@/modules/coaching/lib/queries'
import { CoachApplicationForm } from './CoachApplicationForm'

export const metadata: Metadata = {
  title: 'Apply to Coach | Ride MTB',
  description: 'Apply to become a certified coach on Ride MTB.',
}

export default async function CoachApplyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const existing = await getMyCoachApplication(session.user.id)

  if (existing?.status === 'approved') {
    redirect('/coaching/dashboard')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <Link href="/coaching" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">← Back to Coaches</Link>
        <h1 className="mt-4 text-3xl font-bold text-[var(--color-text)]">Apply to Coach</h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Share your experience and qualifications. Our team reviews all applications within 3–5 business days.
        </p>
        {existing?.status === 'pending' && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            Your application is under review. We&apos;ll notify you when it&apos;s processed.
          </div>
        )}
        {existing?.status === 'rejected' && existing.reviewNote && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            <strong>Application not approved:</strong> {existing.reviewNote}. You can reapply below.
          </div>
        )}
      </div>
      <CoachApplicationForm existing={existing} />
    </div>
  )
}
