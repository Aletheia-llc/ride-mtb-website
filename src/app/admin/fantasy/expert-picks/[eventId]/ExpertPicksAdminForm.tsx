'use client'

import { useState } from 'react'
import { setExpertPick, publishExpertPicks } from '@/modules/fantasy/actions/admin/publishExpertPick'
import type { ExpertPick, Rider } from '@/generated/prisma/client'

export function ExpertPicksAdminForm({
  eventId,
  picks,
  riders,
}: {
  eventId: string
  picks: (ExpertPick & { rider: Rider })[]
  riders: Rider[]
}) {
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const currentBySlot = Object.fromEntries(picks.map(p => [p.slot, p.riderId]))
  const publishedCount = picks.filter(p => p.publishedAt).length

  async function handleSlotChange(slot: number, riderId: string) {
    if (!riderId) return

    setSaving(true)
    setErrors({})
    setSuccessMessage('')

    const result = await setExpertPick({ eventId, riderId, slot })
    if (result.errors && Object.keys(result.errors).length > 0) {
      setErrors(result.errors)
    } else if (result.success) {
      setSuccessMessage(`Slot ${slot} updated`)
      setTimeout(() => setSuccessMessage(''), 3000)
    }

    setSaving(false)
  }

  async function handlePublish() {
    setPublishing(true)
    setErrors({})
    setSuccessMessage('')

    const result = await publishExpertPicks(eventId)
    if (result.errors && Object.keys(result.errors).length > 0) {
      setErrors(result.errors)
    } else if (result.success) {
      setSuccessMessage('All picks published successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    }

    setPublishing(false)
  }

  const filledSlots = picks.filter(p => p.riderId).length
  const canPublish = filledSlots === 6 && publishedCount === 0

  return (
    <div className="space-y-6">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-900">
          {errors.general}
        </div>
      )}

      {successMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          {successMessage}
        </div>
      )}

      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map(slot => (
          <div key={slot} className="flex items-center gap-4">
            <span className="w-16 text-sm font-semibold">Slot {slot}</span>
            <select
              defaultValue={currentBySlot[slot] ?? ''}
              onChange={e => handleSlotChange(slot, e.target.value)}
              disabled={saving || publishedCount > 0}
              className="flex-1 border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] text-sm disabled:opacity-50"
            >
              <option value="">— Select rider —</option>
              {riders.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {currentBySlot[slot] && (
              <span className="text-xs text-[var(--color-text-muted)]">
                {picks.find(p => p.slot === slot)?.publishedAt && '✓ Published'}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          {filledSlots} / 6 slots filled
          {publishedCount > 0 && ` · ${publishedCount} published`}
        </p>
        <button
          onClick={handlePublish}
          disabled={!canPublish || publishing}
          className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishing ? 'Publishing...' : 'Publish All 6 Picks'}
        </button>
      </div>

      {filledSlots < 6 && publishedCount === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
          Set all 6 slots before publishing.
        </p>
      )}

      {publishedCount > 0 && (
        <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded p-3">
          These picks have been published and cannot be edited. Create a new event to set different picks.
        </p>
      )}
    </div>
  )
}
