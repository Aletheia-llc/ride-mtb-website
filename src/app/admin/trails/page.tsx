import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'
import { pool } from '@/lib/db/client'
import { TrailImportList } from '@/modules/trails/components/TrailImportList'

export const metadata: Metadata = {
  title: 'Trail Import Review | Admin | Ride MTB',
}

interface PendingSystem {
  id: string
  name: string
  state: string | null
  trailCount: number
  totalMiles: number
  importSource: string
  externalId: string
}

export default async function AdminTrailsPage() {
  await requireAdmin()
  const { rows } = await pool.query<PendingSystem>(`
    SELECT id, name, state, "trailCount", "totalMiles", "importSource", "externalId"
    FROM trail_systems
    WHERE status = 'pending' AND "importSource" IS NOT NULL
    ORDER BY state NULLS LAST, name
  `)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Trail Import Review</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {rows.length} pending import{rows.length !== 1 ? 's' : ''} — USFS-sourced systems awaiting review before publishing
        </p>
      </div>
      <TrailImportList systems={rows} />
    </div>
  )
}
