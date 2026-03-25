'use client'
import { useState } from 'react'

type EventPin = { id: string; title: string; slug: string; startDate: Date; eventType: string | null }

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { firstDay, daysInMonth }
}

export function CalendarView({ events }: { events: EventPin[] }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const { firstDay, daysInMonth } = getCalendarDays(viewYear, viewMonth)
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' })

  const eventsByDay: Record<number, EventPin[]> = {}
  events.forEach(e => {
    const d = new Date(e.startDate)
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate()
      if (!eventsByDay[day]) eventsByDay[day] = []
      eventsByDay[day].push(e)
    }
  })

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) } else setViewMonth(m => m-1) }}
          className="p-1 rounded hover:bg-[var(--color-bg)] text-[var(--color-text-muted)]">&#8249;</button>
        <span className="text-sm font-semibold text-[var(--color-text)]">{monthName}</span>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) } else setViewMonth(m => m+1) }}
          className="p-1 rounded hover:bg-[var(--color-bg)] text-[var(--color-text-muted)]">&#8250;</button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="py-2 text-xs font-medium text-[var(--color-text-muted)] border-b border-[var(--color-border)]">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className={`min-h-16 p-1 border-b border-r border-[var(--color-border)] ${!day ? 'bg-[var(--color-bg-secondary)]' : ''}`}>
            {day && (
              <>
                <div className={`text-xs font-medium mb-1 ${day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear() ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>{day}</div>
                {(eventsByDay[day] ?? []).slice(0, 2).map(e => (
                  <a key={e.id} href={`/events/${e.slug}`}
                    className="block truncate text-xs rounded px-1 py-0.5 mb-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20">
                    {e.title}
                  </a>
                ))}
                {(eventsByDay[day]?.length ?? 0) > 2 && <span className="text-xs text-[var(--color-text-muted)]">+{eventsByDay[day].length - 2}</span>}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
