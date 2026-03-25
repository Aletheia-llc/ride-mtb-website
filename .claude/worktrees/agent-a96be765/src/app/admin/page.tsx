import { AdminDashboard } from '@/modules/admin'
// eslint-disable-next-line no-restricted-imports
import { getAdminStats } from '@/modules/admin/lib/queries'

export default async function AdminPage() {
  const stats = await getAdminStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Platform overview and management tools.
        </p>
      </div>

      <AdminDashboard stats={stats} />
    </div>
  )
}
