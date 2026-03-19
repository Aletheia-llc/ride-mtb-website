'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, CheckCircle, Loader2, ExternalLink } from 'lucide-react'
import {
  createStripeAccount,
  createOnboardingLink,
} from '@/modules/marketplace/actions/stripe-connect'

interface StripeOnboardingProps {
  isOnboarded: boolean
  userId: string
}

export function StripeOnboarding({ isOnboarded, userId }: StripeOnboardingProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [onboarded, setOnboarded] = useState(isOnboarded)
  const [step, setStep] = useState<'start' | 'redirecting'>('start')

  // Initiate Stripe Connect setup
  const handleSetup = () => {
    setError(null)
    setStep('redirecting')
    startTransition(async () => {
      try {
        // Ensure a Stripe account exists, then get the onboarding link
        await createStripeAccount(userId)
        const onboardingUrl = await createOnboardingLink(userId)
        window.location.href = onboardingUrl
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to start onboarding',
        )
        setStep('start')
      }
    })
  }

  // Already onboarded — show success state
  if (onboarded) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
          <CheckCircle className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-[var(--color-text)]">
          Payments Connected
        </h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Your Stripe account is set up and ready to accept payments. When your
          items sell, payouts will be deposited directly to your bank account.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => router.push('/marketplace/sell')}
            className="cursor-pointer rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            List an Item
          </button>
          <button
            onClick={() => router.push('/marketplace/my/sales')}
            className="cursor-pointer rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            View Sales
          </button>
        </div>
      </div>
    )
  }

  // Default — start onboarding
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                s === 1
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary,var(--color-bg))] text-[var(--color-dim)]'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div className="h-0.5 w-8 bg-[var(--color-border)]" />
            )}
          </div>
        ))}
      </div>
      <div className="mb-6 flex justify-center gap-12 text-xs text-[var(--color-dim)]">
        <span className="font-medium text-[var(--color-primary)]">Create</span>
        <span>Verify</span>
        <span>Done</span>
      </div>

      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
          <CreditCard className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-[var(--color-text)]">
          Set Up Payments
        </h2>
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">
          To accept payments for shipped items, connect your Stripe account.
          This is a one-time setup that takes about 5 minutes.
        </p>
        <p className="mb-6 text-xs text-[var(--color-dim)]">
          Stripe handles all payment processing securely. We never see your bank
          details.
        </p>
        {error && (
          <p className="mb-4 text-sm text-red-500">{error}</p>
        )}
        <button
          onClick={handleSetup}
          disabled={isPending}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && step === 'redirecting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              Connect with Stripe
            </>
          )}
        </button>
      </div>
    </div>
  )
}
