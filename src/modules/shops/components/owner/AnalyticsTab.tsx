interface DayStat {
  date: string
  websiteClicks: number
  phoneClicks: number
  directionsClicks: number
}

interface Summary {
  websiteClicks: number
  phoneClicks: number
  directionsClicks: number
}

interface Props {
  summary: Summary
  byDay: DayStat[]
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-4">
      <div className={`mb-2 h-1 w-8 rounded ${color}`} />
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">{label}</p>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${color}`} />
      {label}
    </span>
  )
}

export function AnalyticsTab({ summary, byDay }: Props) {
  const maxTotal = Math.max(...byDay.map((d) => d.websiteClicks + d.phoneClicks + d.directionsClicks), 1)

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Website Clicks" value={summary.websiteClicks} color="bg-blue-500" />
        <SummaryCard label="Phone Clicks" value={summary.phoneClicks} color="bg-green-500" />
        <SummaryCard label="Directions Clicks" value={summary.directionsClicks} color="bg-purple-500" />
      </div>

      {/* 30-day chart */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-[var(--color-text-muted)]">Last 30 days</h2>
        <div className="flex items-end gap-px h-32 overflow-hidden">
          {byDay.map((day) => {
            const total = day.websiteClicks + day.phoneClicks + day.directionsClicks
            const totalPct = total === 0 ? 0 : Math.max(4, Math.round((total / maxTotal) * 100))
            const wShare = total > 0 ? Math.round((day.websiteClicks / total) * 100) : 0
            const pShare = total > 0 ? Math.round((day.phoneClicks / total) * 100) : 0
            const dShare = total > 0 ? 100 - wShare - pShare : 0
            return (
              <div
                key={day.date}
                title={`${day.date}\nWebsite: ${day.websiteClicks}\nPhone: ${day.phoneClicks}\nDirections: ${day.directionsClicks}`}
                className="flex-1 flex flex-col justify-end"
                style={{ height: '100%' }}
              >
                {total > 0 && (
                  <div
                    className="w-full flex flex-col opacity-80 hover:opacity-100 transition-opacity"
                    style={{ height: `${totalPct}%` }}
                  >
                    <div className="bg-purple-500 w-full" style={{ height: `${dShare}%` }} />
                    <div className="bg-green-500 w-full" style={{ height: `${pShare}%` }} />
                    <div className="bg-blue-500 w-full" style={{ height: `${wShare}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>{byDay[0]?.date ?? ''}</span>
          <span>{byDay[byDay.length - 1]?.date ?? ''}</span>
        </div>
        <div className="mt-3 flex gap-4 text-xs">
          <LegendItem color="bg-blue-500" label="Website" />
          <LegendItem color="bg-green-500" label="Phone" />
          <LegendItem color="bg-purple-500" label="Directions" />
        </div>
      </div>
    </div>
  )
}
