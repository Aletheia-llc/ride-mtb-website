const CONDITION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DRY:       { bg: 'bg-yellow-500/10', text: 'text-yellow-600', label: 'Dry' },
  TACKY:     { bg: 'bg-green-500/10',  text: 'text-green-600',  label: 'Tacky' },
  HERO_DIRT: { bg: 'bg-emerald-500/10',text: 'text-emerald-600',label: 'Hero Dirt' },
  DUSTY:     { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Dusty' },
  MUDDY:     { bg: 'bg-amber-900/10',  text: 'text-amber-800',  label: 'Muddy' },
  WET:       { bg: 'bg-blue-500/10',   text: 'text-blue-600',   label: 'Wet' },
  SOFT:      { bg: 'bg-blue-300/10',   text: 'text-blue-500',   label: 'Soft' },
  SNOWY:     { bg: 'bg-sky-500/10',    text: 'text-sky-600',    label: 'Snowy' },
  ICY:       { bg: 'bg-cyan-500/10',   text: 'text-cyan-600',   label: 'Icy' },
  CLOSED:    { bg: 'bg-red-500/10',    text: 'text-red-600',    label: 'Closed' },
}

export function ConditionBadge({ condition, reportedAt }: { condition: string; reportedAt?: Date | null }) {
  const style = CONDITION_COLORS[condition] ?? { bg: 'bg-gray-500/10', text: 'text-gray-500', label: condition }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
      {reportedAt && (
        <span className="opacity-60">· {new Date(reportedAt).toLocaleDateString()}</span>
      )}
    </span>
  )
}
