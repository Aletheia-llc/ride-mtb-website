import type { Metadata } from 'next'
import { AdminCreatorPanel } from '@/modules/creators'

export const metadata: Metadata = {
  title: 'Creator Management | Admin | Ride MTB',
}

export default function AdminCreatorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Creator Management</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Manage creator invites, profiles, and payout settings.
        </p>
      </div>
      <AdminCreatorPanel />
    </div>
  )
}
