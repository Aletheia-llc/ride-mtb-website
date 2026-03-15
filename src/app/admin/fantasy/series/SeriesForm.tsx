'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createSeries, updateSeries } from '@/modules/fantasy/actions/admin/manageSeries'
import type { CreateSeriesState, UpdateSeriesState } from '@/modules/fantasy/actions/admin/manageSeries'
import type { FantasySeries } from '@/generated/prisma/client'
import { Card } from '@/ui/components'

interface SeriesFormProps {
  series?: FantasySeries
}

const DISCIPLINE_OPTIONS = [
  { value: 'dh', label: 'UCI DH World Cup' },
  { value: 'ews', label: 'Enduro World Series' },
  { value: 'xc', label: 'UCI XC World Cup' },
]

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export function SeriesForm({ series }: SeriesFormProps) {
  const isNew = !series
  const [state, formAction, pending] = useActionState<CreateSeriesState | UpdateSeriesState, FormData>(
    isNew ? createSeries : updateSeries,
    { errors: {} },
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/fantasy/series"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Series
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          {isNew ? 'New Series' : `Edit ${series?.name}`}
        </h1>
      </div>

      <Card className="p-6">
        <form action={formAction} className="space-y-6">
          {series?.id && <input type="hidden" name="id" value={series.id} />}

          {state.errors?.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.errors.general}
            </div>
          )}

          {/* Series Name */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Series Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={series?.name ?? ''}
              className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                state.errors?.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
              }`}
              placeholder="e.g. UCI DH World Cup 2026"
            />
            {state.errors?.name && (
              <p className="mt-1 text-xs text-red-600">{state.errors.name}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Discipline */}
            <div>
              <label htmlFor="discipline" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Discipline <span className="text-red-500">*</span>
              </label>
              <select
                id="discipline"
                name="discipline"
                required
                defaultValue={series?.discipline ?? 'dh'}
                disabled={!isNew}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:outline-none ${
                  state.errors?.discipline
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                } disabled:opacity-50`}
              >
                {DISCIPLINE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {state.errors?.discipline && (
                <p className="mt-1 text-xs text-red-600">{state.errors.discipline}</p>
              )}
              {!isNew && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Cannot change after creation</p>
              )}
            </div>

            {/* Season */}
            <div>
              <label htmlFor="season" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Season (Year) <span className="text-red-500">*</span>
              </label>
              <input
                id="season"
                name="season"
                type="number"
                required
                min="2020"
                max="2100"
                defaultValue={series?.season ?? new Date().getFullYear()}
                disabled={!isNew}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                  state.errors?.season
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                } disabled:opacity-50`}
              />
              {state.errors?.season && (
                <p className="mt-1 text-xs text-red-600">{state.errors.season}</p>
              )}
              {!isNew && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Cannot change after creation</p>
              )}
            </div>
          </div>

          {/* Status (edit only) */}
          {!isNew && (
            <div>
              <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={series?.status ?? 'upcoming'}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:outline-none ${
                  state.errors?.status
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {state.errors?.status && (
                <p className="mt-1 text-xs text-red-600">{state.errors.status}</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Salary Cap */}
            <div>
              <label htmlFor="salaryCap" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Salary Cap <span className="text-[var(--color-text-muted)] text-xs">(optional)</span>
              </label>
              <input
                id="salaryCap"
                name="salaryCap"
                type="number"
                defaultValue={series?.salaryCap ?? 150_000_000}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                  state.errors?.salaryCap
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
              />
              {state.errors?.salaryCap && (
                <p className="mt-1 text-xs text-red-600">{state.errors.salaryCap}</p>
              )}
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Default: 150,000,000</p>
            </div>

            {/* Sensitivity Factor */}
            <div>
              <label htmlFor="sensitivityFactor" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Sensitivity Factor <span className="text-[var(--color-text-muted)] text-xs">(optional)</span>
              </label>
              <input
                id="sensitivityFactor"
                name="sensitivityFactor"
                type="number"
                step="0.1"
                defaultValue={series?.sensitivityFactor ?? 1.5}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none ${
                  state.errors?.sensitivityFactor
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
              />
              {state.errors?.sensitivityFactor && (
                <p className="mt-1 text-xs text-red-600">{state.errors.sensitivityFactor}</p>
              )}
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Default: 1.5</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[var(--color-primary)] px-6 py-2 font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {pending ? 'Saving...' : isNew ? 'Create Series' : 'Save Changes'}
            </button>
            <Link
              href="/admin/fantasy/series"
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
