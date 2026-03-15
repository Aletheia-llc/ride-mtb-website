export const POSITION_POINTS: Record<number, number> = {
  1: 30, 2: 28, 3: 26, 4: 24, 5: 22,
  6: 20, 7: 18, 8: 16, 9: 14, 10: 12,
  11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
  16: 5, 17: 4, 18: 3, 19: 2, 20: 1,
}

export const DNS_DNF_POINTS = -2
export const FASTEST_QUALIFIER_BONUS = 5
export const STAGE_WIN_BONUS = 3
export const HOME_PODIUM_BONUS = 3
export const WILDCARD_TOP10_BONUS = 5
export const PERFECT_ROUND_BONUS = 10
export const WILDCARD_PRICE_THRESHOLD = 20_000_000 // $200K in cents

// Half-table: POSITION_POINTS × 0.5, rounded to nearest integer. No negative for DNS/DNF.
export const MANUFACTURER_POSITION_POINTS: Record<number, number> = {
  1: 15, 2: 14, 3: 13, 4: 12, 5: 11,
  6: 10, 7: 9,  8: 8,  9: 7,  10: 6,
  11: 5, 12: 5, 13: 4, 14: 4, 15: 3,
  16: 3, 17: 2, 18: 2, 19: 1, 20: 1,
}
