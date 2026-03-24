'use client'

import { useState } from 'react'
import { verifyOrganizer } from '../actions/admin'

interface Organizer {
  id: string
  name: string
  isVerified: boolean
}

interface OrganizerManagerProps {
  organizers: Organizer[]
}

export function OrganizerManager({ organizers }: OrganizerManagerProps) {
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleVerify(id: string) {
    setProcessing(id)
    try {
      await verifyOrganizer(id)
    } finally {
      setProcessing(null)
    }
  }

  if (organizers.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-12 text-center">
        <p className="text-[var(--color-text-muted)]">No organizer profiles yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Name</th>
            <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
            <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {organizers.map((organizer) => (
            <tr key={organizer.id} className="hover:bg-[var(--color-bg-secondary)]">
              <td className="px-4 py-3 font-medium text-[var(--color-text)]">{organizer.name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    organizer.isVerified
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {organizer.isVerified ? 'Verified' : 'Unverified'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  {!organizer.isVerified && (
                    <button
                      onClick={() => handleVerify(organizer.id)}
                      disabled={processing === organizer.id}
                      className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
                    >
                      {processing === organizer.id ? 'Verifying…' : 'Verify'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
