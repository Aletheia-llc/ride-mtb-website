'use client'

import { useActionState } from 'react'
import { upsertRaceResult, type UpsertResultState } from '@/modules/fantasy/actions/admin/manageResults'

interface Rider {
  id: string
  name: string
}

interface ExistingResult {
  riderId: string
  finishPosition: number | null
  qualifyingPosition: number | null
  dnsDnf: boolean
  partialCompletion: boolean
  status: string
}

interface Props {
  eventId: string
  rider: Rider
  result?: ExistingResult
}

const initial: UpsertResultState = { errors: {} }

export function RiderResultRow({ eventId, rider, result }: Props) {
  const [state, action, pending] = useActionState(upsertRaceResult, initial)

  return (
    <tr className="border-b border-[var(--color-border)]">
      <td className="py-2 pr-3 font-medium">{rider.name}</td>
      <form action={action} className="contents">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="riderId" value={rider.id} />
        <td className="py-2 pr-3">
          <input
            type="number"
            name="finishPosition"
            defaultValue={result?.finishPosition ?? ''}
            min={1}
            className="w-20 px-2 py-1 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-sm"
            placeholder="—"
          />
        </td>
        <td className="py-2 pr-3">
          <input
            type="number"
            name="qualifyingPosition"
            defaultValue={result?.qualifyingPosition ?? ''}
            min={1}
            className="w-20 px-2 py-1 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-sm"
            placeholder="—"
          />
        </td>
        <td className="py-2 pr-3">
          <input
            type="checkbox"
            name="dnsDnf"
            value="true"
            defaultChecked={result?.dnsDnf ?? false}
            className="h-4 w-4"
          />
        </td>
        <td className="py-2 pr-3">
          <input
            type="checkbox"
            name="partialCompletion"
            value="true"
            defaultChecked={result?.partialCompletion ?? false}
            className="h-4 w-4"
          />
        </td>
        <td className="py-2 pr-3">
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
            result?.status === 'confirmed' ? 'bg-green-100 text-green-700' :
            result?.status === 'scored' ? 'bg-blue-100 text-blue-700' :
            'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
          }`}>
            {result?.status ?? 'none'}
          </span>
        </td>
        <td className="py-2 pr-3">
          {state.errors.general && (
            <span className="text-xs text-red-500">{state.errors.general}</span>
          )}
          {state.success && (
            <span className="text-xs text-green-600">✓</span>
          )}
        </td>
        <td className="py-2">
          <button
            type="submit"
            disabled={pending}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? '…' : 'Save'}
          </button>
        </td>
      </form>
    </tr>
  )
}
