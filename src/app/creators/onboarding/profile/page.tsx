'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveCreatorProfile,
  type SaveCreatorProfileState,
} from '@/modules/creators/actions/saveCreatorProfile'

export default function CreatorProfilePage() {
  const router = useRouter()
  const [state, action, isPending] = useActionState<SaveCreatorProfileState, FormData>(
    saveCreatorProfile,
    { errors: {} },
  )

  useEffect(() => {
    if (state.success) router.push('/creators/onboarding/stripe')
  }, [state.success, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Step 1 of 2
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            Set up your creator profile
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            This is what viewers will see on your creator page.
          </p>
        </div>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="displayName" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '0.375rem' }}>
              Display Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              placeholder="e.g. Kyle Warner MTB"
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: `1px solid ${state.errors.displayName ? 'red' : 'var(--color-border)'}`, borderRadius: 8, background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
            {state.errors.displayName && (
              <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.25rem' }}>{state.errors.displayName}</p>
            )}
          </div>

          <div>
            <label htmlFor="bio" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '0.375rem' }}>
              Bio <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Tell viewers about yourself and your riding..."
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label htmlFor="youtubeChannelUrl" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '0.375rem' }}>
              YouTube Channel URL <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>(optional)</span>
            </label>
            <input
              id="youtubeChannelUrl"
              name="youtubeChannelUrl"
              type="url"
              placeholder="https://youtube.com/@yourchannel"
              style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 8, padding: '1rem' }}>
            <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="licensingAttested"
                value="true"
                required
                style={{ marginTop: '0.2rem', flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                I confirm that I own all rights to the content I will submit, and I authorize Ride MTB
                to host, stream, and monetize it on the platform.
              </span>
            </label>
            {state.errors.licensingAttested && (
              <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem' }}>{state.errors.licensingAttested}</p>
            )}
          </div>

          {state.errors.general && (
            <p style={{ color: 'red', fontSize: '0.85rem' }}>{state.errors.general}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.95rem', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1 }}
          >
            {isPending ? 'Saving...' : 'Continue to Stripe Setup →'}
          </button>
        </form>
      </div>
    </div>
  )
}
