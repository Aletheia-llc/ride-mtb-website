'use client'

import { useState } from 'react'

type Tab = 'videos' | 'analytics' | 'wallet' | 'settings'

interface CreatorDashboardProps {
  displayName: string
  status: string
  stripeConnected: boolean
}

export function CreatorDashboard({ displayName, status, stripeConnected }: CreatorDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('videos')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'videos', label: 'Videos' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      {status !== 'active' && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm font-medium text-yellow-700">
            Your creator account is pending activation.
            {!stripeConnected && (
              <> <a href="/creators/onboarding/stripe" className="underline">Complete your Stripe setup</a> to go live.</>
            )}
            {stripeConnected && ' Stripe has your details — activation usually takes a few hours.'}
          </p>
        </div>
      )}

      <div className="mb-6 border-b border-[var(--color-border)]">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'videos' && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-3 text-4xl">🎬</p>
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">No videos yet</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Video ingestion ships in Phase 2. Once live, your YouTube videos will appear here automatically.
          </p>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-3 text-4xl">📊</p>
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">Analytics coming soon</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Views, earnings, and top videos will appear here once your content is live.
          </p>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-3 text-4xl">💰</p>
          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">$0.00 available</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Earnings from pre-roll ads will appear here. Minimum payout is $50.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Display Name</p>
            <p className="mt-1 text-sm text-[var(--color-text)]">{displayName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Stripe Status</p>
            <p className="mt-1 text-sm">
              {stripeConnected
                ? <span className="text-green-600">Connected</span>
                : <a href="/creators/onboarding/stripe" className="text-[var(--color-primary)] underline">Connect Stripe account</a>}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Account Status</p>
            <p className="mt-1 text-sm capitalize text-[var(--color-text)]">{status}</p>
          </div>
        </div>
      )}
    </div>
  )
}
