'use client'

import { useState } from 'react'

interface LocationPickerProps {
  onLocationChange: (location: { address: string; latitude: number | null; longitude: number | null }) => void
}

export function LocationPicker({ onLocationChange }: LocationPickerProps) {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function geocode() {
    if (!address.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = await res.json()
      setResult(data.placeName ?? address)
      onLocationChange({ address, latitude: data.latitude, longitude: data.longitude })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Venue address or city, state"
          className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
        <button type="button" onClick={geocode} disabled={loading}
          className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-50">
          {loading ? 'Looking up…' : 'Find'}
        </button>
      </div>
      {result && <p className="text-xs text-[var(--color-text-muted)]">📍 {result}</p>}
    </div>
  )
}
