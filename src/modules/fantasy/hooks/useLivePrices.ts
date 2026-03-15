// src/modules/fantasy/hooks/useLivePrices.ts
'use client'

import { useState, useEffect, useRef } from 'react'

export type LivePriceEntry = { cents: number; prev: number | null }
export type LivePrices = Record<string, LivePriceEntry>

export function useLivePrices(
  eventId: string,
  isLocked: boolean
): { prices: LivePrices; loading: boolean } {
  const [prices, setPrices] = useState<LivePrices>({})
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isLocked) {
      // Roster is locked — one final fetch then stop
      fetch(`/api/fantasy/prices/${eventId}`)
        .then(res => res.json())
        .then(data => { if (data?.prices) setPrices(data.prices) })
        .catch(() => {})
        .finally(() => setLoading(false))
      return
    }

    let cancelled = false

    async function fetchPrices() {
      try {
        const res = await fetch(`/api/fantasy/prices/${eventId}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data?.prices) setPrices(data.prices)
      } catch {
        // Silently ignore network errors — stale prices remain displayed
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPrices()
    intervalRef.current = setInterval(fetchPrices, 15_000)

    return () => {
      cancelled = true
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [eventId, isLocked])

  return { prices, loading }
}
