'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createRider, updateRider } from '@/modules/fantasy/actions/admin/manageRider'
import type { CreateRiderState, UpdateRiderState } from '@/modules/fantasy/actions/admin/manageRider'
import type { Rider } from '@/generated/prisma/client'
import { Card } from '@/ui/components'

interface RiderFormProps {
  rider?: Rider
  manufacturers: { id: string; name: string }[]
}

const DISCIPLINE_OPTIONS = [
  { value: 'dh', label: 'DH' },
  { value: 'ews', label: 'EWS' },
  { value: 'xc', label: 'XC' },
]

export function RiderForm({ rider, manufacturers }: RiderFormProps) {
  const isNew = !rider
  const [state, formAction, pending] = useActionState<CreateRiderState | UpdateRiderState, FormData>(
    isNew ? createRider : updateRider,
    { errors: {} },
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/fantasy/riders"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Riders
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          {isNew ? 'New Rider' : `Edit ${rider?.name}`}
        </h1>
      </div>

      <Card className="p-6">
        <form action={formAction} className="space-y-6">
          {rider?.id && <input type="hidden" name="id" value={rider.id} />}

          {state.errors?.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.errors.general}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={rider?.name ?? ''}
              className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                state.errors?.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
              }`}
              placeholder="e.g. Loic Bruni"
            />
            {state.errors?.name && (
              <p className="mt-1 text-xs text-red-600">{state.errors.name}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nationality */}
            <div>
              <label htmlFor="nationality" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Nationality <span className="text-red-500">*</span>
              </label>
              <input
                id="nationality"
                name="nationality"
                type="text"
                required
                maxLength={3}
                defaultValue={rider?.nationality ?? ''}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none uppercase ${
                  state.errors?.nationality
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
                placeholder="e.g. FR"
              />
              {state.errors?.nationality && (
                <p className="mt-1 text-xs text-red-600">{state.errors.nationality}</p>
              )}
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">2–3 letter ISO country code</p>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                required
                defaultValue={rider?.gender ?? 'male'}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:outline-none ${
                  state.errors?.gender
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {state.errors?.gender && (
                <p className="mt-1 text-xs text-red-600">{state.errors.gender}</p>
              )}
            </div>
          </div>

          {/* Disciplines */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Disciplines <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6">
              {DISCIPLINE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    name="disciplines"
                    value={opt.value}
                    defaultChecked={rider?.disciplines.includes(opt.value as 'dh' | 'ews' | 'xc') ?? false}
                    className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {state.errors?.disciplines && (
              <p className="mt-1 text-xs text-red-600">{state.errors.disciplines}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* UCI ID */}
            <div>
              <label htmlFor="uciId" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                UCI ID <span className="text-[var(--color-text-muted)] text-xs">(optional)</span>
              </label>
              <input
                id="uciId"
                name="uciId"
                type="text"
                defaultValue={rider?.uciId ?? ''}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                  state.errors?.uciId
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
                placeholder="e.g. 10003349916"
              />
              {state.errors?.uciId && (
                <p className="mt-1 text-xs text-red-600">{state.errors.uciId}</p>
              )}
            </div>

            {/* Photo URL */}
            <div>
              <label htmlFor="photoUrl" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Photo URL <span className="text-[var(--color-text-muted)] text-xs">(optional)</span>
              </label>
              <input
                id="photoUrl"
                name="photoUrl"
                type="url"
                defaultValue={rider?.photoUrl ?? ''}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                  state.errors?.photoUrl
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
                placeholder="https://..."
              />
              {state.errors?.photoUrl && (
                <p className="mt-1 text-xs text-red-600">{state.errors.photoUrl}</p>
              )}
            </div>
          </div>

          {/* Manufacturer */}
          <div>
            <label htmlFor="manufacturerId" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Manufacturer <span className="text-[var(--color-text-muted)] text-xs">(optional)</span>
            </label>
            <select
              id="manufacturerId"
              name="manufacturerId"
              defaultValue={rider?.manufacturerId ?? ''}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">— None —</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--color-primary)] px-6 py-2 font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {pending ? 'Saving...' : isNew ? 'Create Rider' : 'Save Changes'}
            </button>
            <Link
              href="/admin/fantasy/riders"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
