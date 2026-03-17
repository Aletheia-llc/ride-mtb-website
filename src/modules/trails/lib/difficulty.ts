export function getDifficultyColor(physical: number | null | undefined, technical: number | null | undefined): string {
  const d = Math.max(physical ?? 1, technical ?? 1)
  if (d <= 2) return '#22c55e'   // green — easy
  if (d === 3) return '#3b82f6'  // blue — intermediate
  if (d === 4) return '#f59e0b'  // amber — hard
  return '#ef4444'               // red — expert
}
