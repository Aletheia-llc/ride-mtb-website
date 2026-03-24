import type { Metadata } from 'next'
import { pool } from '@/lib/db/client'
import { OrganizerManager } from '@/modules/events/components/OrganizerManager'

export const metadata: Metadata = {
  title: 'Organizers | Admin | Ride MTB',
}

export default async function AdminOrganizersPage() {
  const result = await pool.query<{
    id: string
    name: string
    isVerified: boolean
  }>(
    `SELECT id, name, "isVerified" FROM organizer_profiles ORDER BY "createdAt" DESC`
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Organizers</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {result.rows.length} organizer profile{result.rows.length !== 1 ? 's' : ''}
        </p>
      </div>
      <OrganizerManager organizers={result.rows} />
    </div>
  )
}
