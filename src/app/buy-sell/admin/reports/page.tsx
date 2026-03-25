import { requireAdmin } from '@/lib/auth/guards'
import { getReports } from '@/modules/marketplace/actions/reports'
import { ReportsList } from '@/modules/marketplace/components/admin/ReportsList'
import type { ReportWithDetails } from '@/modules/marketplace/types'

export const metadata = {
  title: 'Reports | Marketplace Admin | Ride MTB',
}

export default async function AdminReportsPage() {
  await requireAdmin()

  const rawReports = await getReports()
  const reports = rawReports as unknown as ReportWithDetails[]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Reports
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {reports.length} open report{reports.length !== 1 ? 's' : ''}
        </p>
      </div>
      <ReportsList initialReports={reports} />
    </div>
  )
}
