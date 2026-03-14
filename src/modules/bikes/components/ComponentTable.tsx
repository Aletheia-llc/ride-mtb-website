'use client'
import { useActionState } from 'react'
import { addComponent } from '../actions/addComponent'

type Component = { id: string; category: string; brand: string; model: string; weightGrams: number | null; priceCents: number | null; installedAt: Date; isActive: boolean }
type ComponentState = { errors: Record<string, string>; success?: boolean }

const CATEGORIES = ['FRAME','FORK','SHOCK','WHEELS','DRIVETRAIN','BRAKES','COCKPIT','SEATPOST','SADDLE','PEDALS','OTHER']

export function ComponentTable({ bikeId, components }: { bikeId: string; components: Component[] }) {
  const [state, formAction, pending] = useActionState<ComponentState, FormData>(
    addComponent as (s: ComponentState, f: FormData) => Promise<ComponentState>,
    { errors: {} },
  )

  const totalWeightG = components.filter(c => c.isActive && c.weightGrams).reduce((sum, c) => sum + (c.weightGrams ?? 0), 0)
  const totalCost = components.filter(c => c.isActive && c.priceCents).reduce((sum, c) => sum + (c.priceCents ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-6">
        {totalWeightG > 0 && <span className="text-sm text-[var(--color-text-muted)]">Total weight: <strong className="text-[var(--color-text)]">{(totalWeightG / 1000).toFixed(2)} kg</strong></span>}
        {totalCost > 0 && <span className="text-sm text-[var(--color-text-muted)]">Parts cost: <strong className="text-[var(--color-text)]">${(totalCost / 100).toFixed(0)}</strong></span>}
      </div>

      {/* Component list */}
      {components.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-secondary)]">
              <tr>
                {['Category', 'Brand', 'Model', 'Weight', 'Cost'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {components.filter(c => c.isActive).map(c => (
                <tr key={c.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] capitalize">{c.category.toLowerCase()}</td>
                  <td className="px-3 py-2 text-[var(--color-text)]">{c.brand}</td>
                  <td className="px-3 py-2 text-[var(--color-text)]">{c.model}</td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">{c.weightGrams ? `${c.weightGrams}g` : '—'}</td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">{c.priceCents ? `$${(c.priceCents/100).toFixed(0)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add component form */}
      <details className="rounded-lg border border-[var(--color-border)]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[var(--color-text)] select-none">+ Add Component</summary>
        <form action={formAction} className="px-4 pb-4 space-y-3">
          <input type="hidden" name="bikeId" value={bikeId} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Category</label>
              <select name="category" required className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Brand</label>
              <input name="brand" required maxLength={100} className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Model</label>
              <input name="model" required maxLength={100} className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Weight (grams)</label>
              <input name="weightGrams" type="number" min="0" className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]" />
            </div>
          </div>
          {state.errors.general && <p className="text-xs text-red-500">{state.errors.general}</p>}
          <button type="submit" disabled={pending} className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? 'Adding…' : 'Add Component'}
          </button>
        </form>
      </details>
    </div>
  )
}
