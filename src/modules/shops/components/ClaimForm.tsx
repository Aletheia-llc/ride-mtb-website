'use client'
import { useActionState } from 'react'
import { claimShop, type ClaimState } from '../actions/claimShop'

const initial: ClaimState = { errors: {} }

export function ClaimForm({ shopId }: { shopId: string }) {
  const [state, action, pending] = useActionState(claimShop, initial)

  if (state.success) {
    return (
      <p className="text-sm text-[var(--color-success)]">
        Claim submitted! We&apos;ll review and notify you.
      </p>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="shopId" value={shopId} />

      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Your role at this shop
        </label>
        <select
          name="businessRole"
          defaultValue="Owner"
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="Owner">Owner</option>
          <option value="Manager">Manager</option>
          <option value="Employee">Employee</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          Proof of association
        </label>
        <textarea
          name="proofDetail"
          required
          minLength={10}
          maxLength={1000}
          placeholder="e.g. I&apos;m the owner — business email: kyle@bluepinebikes.com"
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] min-h-[100px] resize-y"
        />
      </div>

      {state.errors.general && (
        <p className="text-xs text-[var(--color-danger)]">{state.errors.general}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Submitting…' : 'Submit Claim'}
      </button>
    </form>
  )
}
