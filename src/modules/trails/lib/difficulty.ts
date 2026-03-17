export function getDifficultyColor(physical: number | null | undefined, technical: number | null | undefined): string {
  const d = Math.max(physical ?? 1, technical ?? 1)
  if (d <= 2) return '#22c55e'   // green — easy
  if (d === 3) return '#3b82f6'  // blue — intermediate
  if (d === 4) return '#f59e0b'  // amber — hard
  return '#ef4444'               // red — expert
}

export function getDifficultyLabel(level: number | null | undefined): string {
  const d = level ?? 1
  if (d <= 1) return 'Green'
  if (d === 2) return 'Blue'
  if (d === 3) return 'Black'
  if (d === 4) return 'Double Black'
  return 'Pro'
}
