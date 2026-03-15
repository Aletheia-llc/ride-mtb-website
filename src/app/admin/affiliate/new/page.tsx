'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { saveAffiliateLinkAction, type SaveAffiliateLinkState } from '@/modules/affiliate/actions/saveAffiliateLink'

export default function NewAffiliateLinkPage() {
  const [state, formAction, pending] = useActionState<SaveAffiliateLinkState, FormData>(saveAffiliateLinkAction, { errors: null })

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/affiliate" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">New Affiliate Link</h1>
      </div>

      <form action={formAction} className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
        {state.errors && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.errors}</div>}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Name *</label>
          <input name="name" required className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" placeholder="e.g. Jenson USA" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Destination URL *</label>
          <input name="url" type="url" required className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" placeholder="https://www.jensonusa.com/?ref=ridemtb" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Slug * <span className="text-[var(--color-text-muted)] font-normal">(URL-safe)</span></label>
            <input name="slug" required className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" placeholder="jenson-usa" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Type</label>
            <select name="linkType" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none">
              <option value="external">External</option>
              <option value="shop_directory">Shop Directory</option>
              <option value="bike_selector">Bike Selector</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Commission %</label>
          <input name="commission" type="number" min="0" max="100" step="0.1" defaultValue="0" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none" />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60">
            {pending ? 'Saving…' : 'Create Link'}
          </button>
        </div>
      </form>
    </div>
  )
}
