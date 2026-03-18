import type { Metadata } from 'next'
import { pool } from '@/lib/db/client'
import { SubmissionQueue } from '@/modules/events/components/SubmissionQueue'

export const metadata: Metadata = {
  title: 'Event Submissions | Admin | Ride MTB',
}

export default async function AdminSubmissionsPage() {
  const result = await pool.query<{
    id: string
    title: string
    eventType: string
    startDate: Date
    city: string | null
    state: string | null
    createdAt: Date
  }>(
    `SELECT id, title, "eventType", "startDate", city, state, "createdAt"
     FROM events WHERE status = 'pending_review' ORDER BY "createdAt" DESC`
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Event Submissions</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {result.rows.length} pending review
        </p>
      </div>
      <SubmissionQueue events={result.rows} />
    </div>
  )
}
