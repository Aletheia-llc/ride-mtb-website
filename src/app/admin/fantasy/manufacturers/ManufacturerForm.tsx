'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createManufacturer, updateManufacturer } from '@/modules/fantasy/actions/admin/manageManufacturer'
import type { ManufacturerFormState } from '@/modules/fantasy/actions/admin/manageManufacturer'
import type { BikeManufacturer } from '@/generated/prisma/client'

interface ManufacturerFormProps {
  manufacturer?: BikeManufacturer
}

export function ManufacturerForm({ manufacturer }: ManufacturerFormProps) {
  const isNew = !manufacturer
  const [state, formAction, pending] = useActionState<ManufacturerFormState, FormData>(
    isNew ? createManufacturer : updateManufacturer,
    { errors: {} }
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fantasy/manufacturers"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft className="h-4 w-4" />
          Back to Manufacturers
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          {isNew ? 'New Manufacturer' : `Edit ${manufacturer?.name}`}
        </h1>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] p-6">
        <form action={formAction} className="space-y-6">
          {manufacturer?.id && <input type="hidden" name="id" value={manufacturer.id} />}

          {state.errors?.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.errors.general}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={manufacturer?.name ?? ''}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                  state.errors?.name
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
                placeholder="e.g. Trek"
              />
              {state.errors?.name && <p className="mt-1 text-xs text-red-600">{state.errors.name}</p>}
            </div>

            <div>
              <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                defaultValue={manufacturer?.slug ?? ''}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                  state.errors?.slug
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
                placeholder="e.g. trek"
              />
              {state.errors?.slug && <p className="mt-1 text-xs text-red-600">{state.errors.slug}</p>}
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Lowercase letters, numbers, hyphens only</p>
            </div>
          </div>

          <div>
            <label htmlFor="logoUrl" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Logo URL <span className="text-[var(--color-text-muted)] text-xs">(optional)</span>
            </label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={manufacturer?.logoUrl ?? ''}
              className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                state.errors?.logoUrl
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
              }`}
              placeholder="https://..."
            />
            {state.errors?.logoUrl && <p className="mt-1 text-xs text-red-600">{state.errors.logoUrl}</p>}
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--color-primary)] px-6 py-2 font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {pending ? 'Saving...' : isNew ? 'Create Manufacturer' : 'Save Changes'}
            </button>
            <Link href="/admin/fantasy/manufacturers"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
