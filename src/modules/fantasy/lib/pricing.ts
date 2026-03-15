export function computeMarketPrice(params: {
  basePriceCents: number
  teamCount: number
  teamsWithRider: number
  sensitivityFactor: number
}): number {
  const effectiveTeamCount = Math.max(params.teamCount, 100)
  const ownershipPct = params.teamsWithRider / effectiveTeamCount
  const multiplier = 1 + ownershipPct * params.sensitivityFactor
  const raw = Math.round(params.basePriceCents * multiplier)
  const floor = Math.round(params.basePriceCents * 0.5)
  const ceiling = Math.round(params.basePriceCents * 3.0)
  return Math.max(floor, Math.min(ceiling, raw))
}

/** Format cents as "$1,234,567" */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
