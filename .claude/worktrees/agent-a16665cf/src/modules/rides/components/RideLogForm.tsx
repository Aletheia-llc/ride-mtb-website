'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { Button, Input } from '@/ui/components'
import { logRide, type LogRideState } from '../actions/logRide'

export function RideLogForm() {
  const [state, action, isPending] = useActionState<LogRideState, FormData>(
    logRide,
    { errors: {} },
  )

  // Trail search state
  const [trailQuery, setTrailQuery] = useState('')
  const [trailResults, setTrailResults] = useState<
    Array<{ id: string; name: string; systemName: string }>
  >([])
  const [selectedTrail, setSelectedTrail] = useState<{
    id: string
    name: string
  } | null>(null)
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Search trails as user types
  useEffect(() => {
    if (trailQuery.length < 2) {
      setTrailResults([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/trails/search?q=${encodeURIComponent(trailQuery)}`,
        )
        if (response.ok) {
          const data = await response.json()
          setTrailResults(data)
          setShowResults(true)
        }
      } catch {
        // Silently ignore search errors
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [trailQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset form on success
  useEffect(() => {
    if (state.success) {
      setTrailQuery('')
      setSelectedTrail(null)
      setTrailResults([])
    }
  }, [state.success])

  return (
    <form action={action} className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--color-text)]">
        Log a Ride
      </h3>

      {state.errors.general && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.errors.general}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          Ride logged successfully!
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Date"
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().split('T')[0]}
          error={state.errors.date}
        />

        <Input
          label="Duration (minutes)"
          name="duration"
          type="number"
          min={1}
          placeholder="e.g. 90"
          error={state.errors.duration}
        />
      </div>

      {/* Trail search */}
      <div className="relative" ref={resultsRef}>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
          Trail (optional)
        </label>
        {selectedTrail ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm">
            <span className="text-[var(--color-text)]">
              {selectedTrail.name}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedTrail(null)
                setTrailQuery('')
              }}
              className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ×
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={trailQuery}
            onChange={(e) => setTrailQuery(e.target.value)}
            onFocus={() => trailResults.length > 0 && setShowResults(true)}
            placeholder="Search for a trail..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        )}
        <input
          type="hidden"
          name="trailId"
          value={selectedTrail?.id ?? ''}
        />

        {showResults && trailResults.length > 0 && !selectedTrail && (
          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg">
            {trailResults.map((trail) => (
              <button
                key={trail.id}
                type="button"
                onClick={() => {
                  setSelectedTrail({ id: trail.id, name: trail.name })
                  setTrailQuery('')
                  setShowResults(false)
                }}
                className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                <span className="font-medium text-[var(--color-text)]">
                  {trail.name}
                </span>
                <span className="ml-2 text-[var(--color-text-muted)]">
                  {trail.systemName}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="ride-notes"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Notes
        </label>
        <textarea
          id="ride-notes"
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="How was the ride?"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
        {state.errors.notes && (
          <p className="text-xs text-red-500">{state.errors.notes}</p>
        )}
      </div>

      <Button type="submit" loading={isPending}>
        Log Ride
      </Button>
    </form>
  )
}
