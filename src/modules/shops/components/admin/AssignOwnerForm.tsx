'use client'
import { useActionState } from 'react'
import { assignShopOwner } from '../../actions/assignShopOwner'

const initial: { error?: string; success?: boolean } = {}

export function AssignOwnerForm() {
  const [state, action, pending] = useActionState(assignShopOwner, initial)
  const inputClass =
    'rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'
  return (
    <form action={action} className="space-y-3">
      <h3 className="font-semibold text-sm">Assign Owner</h3>
      {state.error && (
        <p className="text-[var(--color-danger)] text-sm">{state.error}</p>
      )}
      {state.success && (
        <p className="text-green-600 text-sm">Owner assigned successfully.</p>
      )}
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-xs mb-1 text-[var(--color-text-muted)]">
            Shop ID
          </label>
          <input
            name="shopId"
            className={inputClass}
            required
            placeholder="cuid..."
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-[var(--color-text-muted)]">
            Owner Email
          </label>
          <input
            name="userEmail"
            type="email"
            className={inputClass}
            required
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-sm disabled:opacity-50"
        >
          {pending ? 'Assigning…' : 'Assign'}
        </button>
      </div>
    </form>
  )
}
