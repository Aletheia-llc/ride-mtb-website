'use client'

import { useState } from 'react'
import { approveSubmission, rejectSubmission } from '../actions/admin'

interface PendingEvent {
  id: string
  title: string
  eventType: string
  startDate: Date
  city: string | null
  state: string | null
  createdAt: Date
}

interface SubmissionQueueProps {
  events: PendingEvent[]
}

export function SubmissionQueue({ events }: SubmissionQueueProps) {
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleApprove(id: string) {
    setProcessing(id)
    try {
      await approveSubmission(id)
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(id: string) {
    setProcessing(id)
    try {
      await rejectSubmission(id)
    } finally {
      setProcessing(null)
    }
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-12 text-center">
        <p className="text-[var(--color-text-muted)]">No pending submissions.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Title</th>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Type</th>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Date</th>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Location</th>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Submitted</th>
            <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-[var(--color-bg-secondary)]">
              <td className="px-4 py-3 font-medium text-[var(--color-text)]">{event.title}</td>
              <td className="px-4 py-3 text-[var(--color-text-muted)]">{event.eventType}</td>
              <td className="px-4 py-3 text-[var(--color-text-muted)]">
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(event.startDate))}
              </td>
              <td className="px-4 py-3 text-[var(--color-text-muted)]">
                {event.city && event.state ? `${event.city}, ${event.state}` : event.city ?? event.state ?? '—'}
              </td>
              <td className="px-4 py-3 text-[var(--color-text-muted)]">
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(event.createdAt))}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => handleApprove(event.id)}
                    disabled={processing === event.id}
                    className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(event.id)}
                    disabled={processing === event.id}
                    className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
