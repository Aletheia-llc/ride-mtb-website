'use client'
import { useEffect, useState } from 'react'

export function EventCountdownBadge({ startDate }: { startDate: Date }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(startDate).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Started'); return }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      if (days > 0) setTimeLeft(`${days}d ${hours}h`)
      else {
        const mins = Math.floor((diff % 3600000) / 60000)
        setTimeLeft(`${hours}h ${mins}m`)
      }
    }
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [startDate])

  if (!timeLeft) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]">
      ⏱ {timeLeft}
    </span>
  )
}
