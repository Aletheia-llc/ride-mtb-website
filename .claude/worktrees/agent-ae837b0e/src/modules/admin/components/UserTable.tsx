import { Avatar, Badge } from '@/ui/components'
import type { UserAdminView } from '../types'
import { UserActions } from './UserActions'

interface UserTableProps {
  users: UserAdminView[]
  totalCount: number
  page: number
}

function getRoleBadgeVariant(role: string): 'default' | 'info' | 'warning' {
  switch (role) {
    case 'instructor':
      return 'info'
    case 'admin':
      return 'warning'
    default:
      return 'default'
  }
}

export function UserTable({ users, totalCount, page }: UserTableProps) {
  const pageSize = 25
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-text-muted)]">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">XP</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {users.map((user) => {
              const displayName = user.name || user.username || 'Anonymous'
              const isBanned = user.bannedAt !== null

              return (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-[var(--color-bg-secondary)]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={user.image}
                        alt={displayName}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--color-text)]">
                          {displayName}
                        </p>
                        <p className="truncate text-xs text-[var(--color-text-muted)]">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-medium text-[var(--color-text)]">
                      {user.totalXp.toLocaleString()}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--color-text-muted)] md:table-cell">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {isBanned ? (
                      <Badge variant="error">Banned</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <UserActions user={user} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] px-4 pt-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of{' '}
            {totalCount.toLocaleString()} users
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/admin/users?page=${page - 1}`}
                className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/admin/users?page=${page + 1}`}
                className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
