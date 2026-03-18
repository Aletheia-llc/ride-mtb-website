import type { Metadata } from 'next'
import { ImportManager } from '@/modules/events/components/ImportManager'

export const metadata: Metadata = {
  title: 'Event Import | Admin | Ride MTB',
}

export default function AdminImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Event Import</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Pull events from external sources into the pending review queue.
        </p>
      </div>
      <ImportManager />
    </div>
  )
}
