'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/components'
import { manageUser } from '../actions/manageUser'
import type { UserAdminView } from '../types'

interface UserActionsProps {
  user: UserAdminView
}

export function UserActions({ user }: UserActionsProps) {
  const [state, formAction, isPending] = useActionState(manageUser, {
    errors: {} as Record<string, string>,
  })

  const isBanned = user.bannedAt !== null

  return (
    <div className="flex items-center gap-2">
      {/* Role change */}
      <form action={formAction} className="flex items-center gap-1">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="action" value="changeRole" />
        <select
          name="role"
          defaultValue={user.role}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/20"
          disabled={isPending}
        >
          <option value="user">User</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="submit" size="sm" variant="secondary" loading={isPending}>
          Update
        </Button>
      </form>

      {/* Ban / Unban */}
      <form action={formAction}>
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="action" value={isBanned ? 'unban' : 'ban'} />
        <Button
          type="submit"
          size="sm"
          variant={isBanned ? 'secondary' : 'danger'}
          loading={isPending}
        >
          {isBanned ? 'Unban' : 'Ban'}
        </Button>
      </form>

      {state.errors?.general && (
        <p className="text-xs text-red-500">{state.errors.general}</p>
      )}
    </div>
  )
}
