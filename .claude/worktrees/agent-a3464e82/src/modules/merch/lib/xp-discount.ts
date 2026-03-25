import 'server-only'

const DISCOUNT_TIERS: Record<number, number> = {
  1: 0, 2: 0,
  3: 5, 4: 5,
  5: 10, 6: 10,
  7: 15, 8: 15,
  9: 20, 10: 20,
}

export function getXpDiscount(xpLevel: number): number {
  return DISCOUNT_TIERS[xpLevel] ?? 0
}
