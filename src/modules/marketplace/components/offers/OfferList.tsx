'use client'

import { useState } from 'react'
import { Send, Inbox } from 'lucide-react'
import type { OfferWithDetails } from '@/modules/marketplace/types'
import { OfferCard } from './OfferCard'

interface OfferListProps {
  sent: OfferWithDetails[]
  received: OfferWithDetails[]
}

type Tab = 'sent' | 'received'

export function OfferList({ sent, received }: OfferListProps) {
  const [activeTab, setActiveTab] = useState<Tab>(
    received.length > 0 ? 'received' : 'sent',
  )

  const tabs: {
    key: Tab
    label: string
    count: number
    icon: React.ReactNode
  }[] = [
    {
      key: 'received',
      label: 'Received',
      count: received.length,
      icon: <Inbox className="h-4 w-4" />,
    },
    {
      key: 'sent',
      label: 'Sent',
      count: sent.length,
      icon: <Send className="h-4 w-4" />,
    },
  ]

  const activeOffers = activeTab === 'sent' ? sent : received
  const role = activeTab === 'sent' ? 'buyer' : 'seller'

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Offer list */}
      {activeOffers.length > 0 ? (
        <div className="flex flex-col gap-3">
          {activeOffers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} role={role} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
          {activeTab === 'sent' ? (
            <>
              <Send className="mb-3 h-10 w-10 text-[var(--color-text-muted)]" />
              <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">
                No offers sent
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Browse listings and make offers on items you&apos;re interested
                in.
              </p>
            </>
          ) : (
            <>
              <Inbox className="mb-3 h-10 w-10 text-[var(--color-text-muted)]" />
              <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">
                No offers received
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Offers from buyers will appear here.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
