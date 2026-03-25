'use client'

import { useEffect } from 'react'

interface TrailViewTrackerProps {
  trailSlug: string
  systemSlug: string
  trailName: string
}

const STORAGE_KEY = 'ride-mtb-trail-history'
const MAX_HISTORY = 20

interface TrailHistoryEntry {
  trailSlug: string
  systemSlug: string
  trailName: string
  viewedAt: string // ISO
}

export function TrailViewTracker({ trailSlug, systemSlug, trailName }: TrailViewTrackerProps) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const history: TrailHistoryEntry[] = raw ? JSON.parse(raw) : []
      // Remove existing entry for this trail
      const filtered = history.filter((e) => e.trailSlug !== trailSlug)
      // Add new entry at front
      const updated: TrailHistoryEntry[] = [
        { trailSlug, systemSlug, trailName, viewedAt: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_HISTORY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // localStorage unavailable — ignore
    }
  }, [trailSlug, systemSlug, trailName])

  return null
}
