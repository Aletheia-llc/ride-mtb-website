'use client'

import { useState } from 'react'
import { VideoList } from './VideoList'
import { WalletTab } from './WalletTab'

type Tab = 'videos' | 'analytics' | 'wallet' | 'settings'

interface Video {
  id: string
  title: string
  thumbnailUrl: string | null
  status: 'queued' | 'processing' | 'transcoding' | 'pending_review' | 'live' | 'rejected'
  viewCount: number
  createdAt: Date
  tags: Array<{ id: string; value: string; source: string; confirmed: boolean }>
  _count: { impressions: number }
}

// ── Analytics tab ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<Video['status'], string> = {
  queued: 'Queued',
  processing: 'Processing',
  transcoding: 'Transcoding',
  pending_review: 'Pending Review',
  live: 'Live',
  rejected: 'Rejected',
}

const STATUS_COLORS: Record<Video['status'], string> = {
  queued: 'text-[var(--color-text-muted)]',
  processing: 'text-blue-500',
  transcoding: 'text-blue-500',
  pending_review: 'text-yellow-500',
  live: 'text-green-500',
  rejected: 'text-red-500',
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
    </div>
  )
}

function AnalyticsTab({ videos, balanceCents }: { videos: Video[]; balanceCents: number }) {
  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0)
  const totalImpressions = videos.reduce((sum, v) => sum + v._count.impressions, 0)
  const liveCount = videos.filter((v) => v.status === 'live').length
  const earningsFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(balanceCents / 100)

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Views" value={totalViews.toLocaleString()} />
        <StatCard label="Ad Impressions" value={totalImpressions.toLocaleString()} />
        <StatCard label="Live Videos" value={liveCount} />
        <StatCard label="Wallet Balance" value={earningsFormatted} />
      </div>

      {/* Per-video breakdown */}
      {videos.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Upload videos to see performance data here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">
                  Video
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                  Views
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                  Impressions
                </th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-bg)]">
              {videos.map((v) => (
                <tr key={v.id} className="hover:bg-[var(--color-surface)]">
                  <td className="max-w-0 px-4 py-3">
                    <p className="truncate font-medium text-[var(--color-text)]">{v.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">
                    {v.viewCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text)]">
                    {v._count.impressions.toLocaleString()}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${STATUS_COLORS[v.status]}`}>
                    {STATUS_LABELS[v.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface Transaction {
  id: string
  amountCents: number
  type: string
  createdAt: Date
}

interface CreatorDashboardProps {
  displayName: string
  status: string
  stripeConnected: boolean
  videos: Video[]
  balanceCents: number
  transactions: Transaction[]
  hasPendingPayout: boolean
}

export function CreatorDashboard({
  displayName,
  status,
  stripeConnected,
  videos,
  balanceCents,
  transactions,
  hasPendingPayout,
}: CreatorDashboardProps) {
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

      {activeTab === 'videos' && <VideoList videos={videos} />}

      {activeTab === 'analytics' && (
        <AnalyticsTab videos={videos} balanceCents={balanceCents} />
      )}

      {activeTab === 'wallet' && (
        <WalletTab
          balanceCents={balanceCents}
          transactions={transactions}
          hasPendingPayout={hasPendingPayout}
        />
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
