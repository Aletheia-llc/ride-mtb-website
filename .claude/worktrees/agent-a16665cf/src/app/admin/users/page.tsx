import { Card } from '@/ui/components'
import { UserTable } from '@/modules/admin'
// eslint-disable-next-line no-restricted-imports
import { getUsers } from '@/modules/admin/lib/queries'
import type { UserRole } from '@/generated/prisma/client'

interface PageProps {
  searchParams: Promise<{
    page?: string
    role?: string
    search?: string
  }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const role = (['user', 'instructor', 'admin'].includes(params.role ?? '')
    ? params.role as UserRole
    : undefined)

  const { users, totalCount } = await getUsers(
    {
      role,
      search: params.search,
    },
    page,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">User Management</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {totalCount.toLocaleString()} total users
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="search" className="text-xs font-medium text-[var(--color-text-muted)]">
              Search
            </label>
            <input
              id="search"
              name="search"
              type="text"
              defaultValue={params.search ?? ''}
              placeholder="Name, email, or username..."
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="role" className="text-xs font-medium text-[var(--color-text-muted)]">
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue={params.role ?? ''}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/20"
            >
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            Filter
          </button>

          {(params.search || params.role) && (
            <a
              href="/admin/users"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Clear filters
            </a>
          )}
        </form>
      </Card>

      <Card className="p-0">
        <UserTable users={users} totalCount={totalCount} page={page} />
      </Card>
    </div>
  )
}
