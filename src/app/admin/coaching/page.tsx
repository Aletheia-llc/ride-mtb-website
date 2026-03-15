import type { Metadata } from 'next'
import { getCoachApplications } from '@/modules/coaching/lib/queries'
import { reviewApplicationAction } from '@/modules/coaching/actions/reviewApplication'

export const metadata: Metadata = { title: 'Coach Applications | Admin | Ride MTB' }

export default async function AdminCoachingPage() {
  const pending = await getCoachApplications('pending')
  const reviewed = await getCoachApplications('approved')
  const rejected = await getCoachApplications('rejected')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Coach Applications</h1>

      {/* Pending */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No pending applications.</p>
        ) : (
          <div className="space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {pending.map((app: any) => (
              <div key={app.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">{app.user.name ?? 'Unknown'}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{app.user.email} · {app.title}</p>
                  </div>
                  <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">Pending</span>
                </div>
                <p className="mb-4 text-sm text-[var(--color-text-muted)] line-clamp-3">{app.bio}</p>
                <div className="flex gap-3">
                  <form action={reviewApplicationAction} className="flex gap-2">
                    <input type="hidden" name="id" value={app.id} />
                    <input type="hidden" name="action" value="approve" />
                    <button type="submit" className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700">Approve</button>
                  </form>
                  <form action={reviewApplicationAction} className="flex flex-col gap-2">
                    <input type="hidden" name="id" value={app.id} />
                    <input type="hidden" name="action" value="reject" />
                    <input name="reviewNote" placeholder="Reason for rejection (optional)" className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] focus:outline-none" />
                    <button type="submit" className="rounded-lg border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Approved ({reviewed.length})</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{reviewed.length} coaches active</p>
      </section>

      {/* Rejected */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Rejected ({rejected.length})</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{rejected.length} applications rejected</p>
      </section>
    </div>
  )
}
