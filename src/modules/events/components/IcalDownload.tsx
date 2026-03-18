'use client'

import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { generateEventIcal } from '@/modules/events/actions/ical'

interface IcalDownloadProps {
  slug: string
}

export function IcalDownload({ slug }: IcalDownloadProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const icalString = await generateEventIcal(slug)
      const blob = new Blob([icalString], { type: 'text/calendar' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `event-${slug}.ics`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)] disabled:opacity-60"
    >
      <CalendarPlus className="h-4 w-4" />
      {loading ? 'Preparing…' : 'Add to Calendar'}
    </button>
  )
}
