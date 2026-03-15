'use client'

import { useEffect, useState } from 'react'

export function CountdownTimer({ deadline }: { deadline: Date }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Locked'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [deadline])

  return (
    <span className={`font-mono text-sm font-semibold ${remaining === 'Locked' ? 'text-red-500' : 'text-green-600'}`}>
      {remaining || '...'}
    </span>
  )
}
