interface TrailData {
  id: string
  name: string
  difficulty: string
  technicalDifficulty: string | null
  distance: number | null
  elevationGain: number | null
  currentCondition: string | null
  conditionReportedAt: Date | null
}

export function TrailCompareView({ trailA, trailB }: { trailA: TrailData; trailB: TrailData }) {
  const rows: { label: string; keyA: keyof TrailData; format?: (v: unknown) => string }[] = [
    { label: 'Difficulty', keyA: 'difficulty' },
    { label: 'Technical Difficulty', keyA: 'technicalDifficulty' },
    { label: 'Distance', keyA: 'distance', format: v => v ? `${(v as number).toFixed(1)} mi` : '—' },
    { label: 'Elevation Gain', keyA: 'elevationGain', format: v => v ? `${(v as number).toLocaleString()} ft` : '—' },
    { label: 'Current Condition', keyA: 'currentCondition', format: v => (v as string | null) ?? 'Unknown' },
  ]

  return (
    <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-bg-secondary)]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Metric</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">{trailA.name}</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">{trailB.name}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="border-t border-[var(--color-border)]">
              <td className="px-4 py-3 text-[var(--color-text-muted)]">{row.label}</td>
              <td className="px-4 py-3 text-[var(--color-text)]">{row.format ? row.format(trailA[row.keyA]) : String(trailA[row.keyA] ?? '—')}</td>
              <td className="px-4 py-3 text-[var(--color-text)]">{row.format ? row.format(trailB[row.keyA]) : String(trailB[row.keyA] ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
