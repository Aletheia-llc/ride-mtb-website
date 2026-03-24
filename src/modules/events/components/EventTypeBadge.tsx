const TYPE_COLORS: Record<string, string> = {
  race: 'bg-red-100 text-red-700',
  race_xc: 'bg-red-100 text-red-700',
  race_enduro: 'bg-red-100 text-red-700',
  race_dh: 'bg-red-100 text-red-700',
  race_marathon: 'bg-red-100 text-red-700',
  race_other: 'bg-red-100 text-red-700',
  group_ride: 'bg-green-100 text-green-700',
  clinic: 'bg-blue-100 text-blue-700',
  camp: 'bg-blue-100 text-blue-700',
  skills_clinic: 'bg-blue-100 text-blue-700',
  trail_work: 'bg-amber-100 text-amber-700',
  social: 'bg-purple-100 text-purple-700',
  expo: 'bg-purple-100 text-purple-700',
  demo_day: 'bg-purple-100 text-purple-700',
}

export function EventTypeBadge({ eventType }: { eventType: string }) {
  const cls = TYPE_COLORS[eventType] ?? 'bg-gray-100 text-gray-700'
  const label = eventType.replace(/_/g, ' ')
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  )
}
