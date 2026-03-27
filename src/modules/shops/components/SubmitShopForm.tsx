'use client'
import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { submitShop, type SubmitShopState } from '../actions/submitShop'

const initial: SubmitShopState = { errors: {} }

const SHOP_TYPES = [
  'LOCAL_SHOP', 'CHAIN_STORE', 'ONLINE_RETAILER', 'RENTAL_SHOP',
  'REPAIR_ONLY', 'SUSPENSION_SPECIALIST', 'WHEEL_BUILDER', 'CUSTOM_BUILDER',
  'DEMO_CENTER', 'GUIDE_SERVICE', 'COACHING', 'TRAIL_ADVOCACY', 'OTHER',
]

export function SubmitShopForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [state, action, pending] = useActionState(submitShop, initial)

  useEffect(() => {
    if (state.success && state.slug) {
      router.push(`/shops/${state.slug}/manage/edit`)
    }
  }, [state.success, state.slug, router])

  const inputClass = 'w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]'

  return (
    <form action={action} className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2 text-sm mb-6">
        {[1, 2, 3, 4].map((s) => (
          <span
            key={s}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              s === step
                ? 'bg-[var(--color-primary)] text-white'
                : s < step
                ? 'bg-green-500 text-white'
                : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]'
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      <div className={step === 1 ? 'block space-y-4' : 'hidden'}>
        <h2 className="font-semibold text-lg">Basic Info</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Shop Name *</label>
          <input name="name" className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Shop Type *</label>
          <select name="shopType" className={inputClass} defaultValue="LOCAL_SHOP">
            {SHOP_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Street Address *</label>
          <input name="address" className={inputClass} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">City *</label>
            <input name="city" className={inputClass} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State *</label>
            <input name="state" className={inputClass} required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">ZIP Code</label>
          <input name="zipCode" className={inputClass} />
        </div>
        <button
          type="button"
          onClick={() => setStep(2)}
          className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90"
        >
          Next →
        </button>
      </div>

      {/* Step 2: Contact & Hours */}
      <div className={step === 2 ? 'block space-y-4' : 'hidden'}>
        <h2 className="font-semibold text-lg">Contact &amp; Hours</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input name="phone" type="tel" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input name="email" type="email" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Website</label>
          <input name="websiteUrl" type="url" className={inputClass} placeholder="https://" />
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          Hours can be added after approval from your owner dashboard.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="px-4 py-2 rounded border border-[var(--color-border)] text-sm"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Step 3: Services & Brands */}
      <div className={step === 3 ? 'block space-y-4' : 'hidden'}>
        <h2 className="font-semibold text-lg">Services &amp; Brands</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Services (comma-separated)</label>
          <input name="services" className={inputClass} placeholder="Bike Fitting, Suspension Tuning, Wheel Building" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Brands Carried (comma-separated)</label>
          <input name="brands" className={inputClass} placeholder="Trek, Specialized, Santa Cruz" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea name="description" className={`${inputClass} min-h-[100px]`} />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="px-4 py-2 rounded border border-[var(--color-border)] text-sm"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90"
          >
            Review →
          </button>
        </div>
      </div>

      {/* Step 4: Review & Submit */}
      <div className={step === 4 ? 'block space-y-4' : 'hidden'}>
        <h2 className="font-semibold text-lg">Review &amp; Submit</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Your listing will be submitted for admin review. You won&apos;t appear in the public directory until approved.
        </p>
        {state.errors.general && (
          <p className="text-[var(--color-danger)] text-sm">{state.errors.general}</p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="px-4 py-2 rounded border border-[var(--color-border)] text-sm"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 rounded bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Submitting…' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </form>
  )
}
