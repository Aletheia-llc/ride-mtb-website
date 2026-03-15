import {
  POSITION_POINTS,
  DNS_DNF_POINTS,
  FASTEST_QUALIFIER_BONUS,
  STAGE_WIN_BONUS,
  HOME_PODIUM_BONUS,
  WILDCARD_TOP10_BONUS,
  PERFECT_ROUND_BONUS,
} from '../constants/scoring'

export function getBasePoints(params: {
  finishPosition: number | null
  dnsDnf: boolean
  partialCompletion: boolean
}): number {
  if (params.dnsDnf) return DNS_DNF_POINTS
  if (params.partialCompletion) return 0
  if (!params.finishPosition) return 0
  return POSITION_POINTS[params.finishPosition] ?? 0
}

export function getBonusPoints(params: {
  isFastestQualifier: boolean
  stageWins: number
  homePodium: boolean
}): number {
  let bonus = 0
  if (params.isFastestQualifier) bonus += FASTEST_QUALIFIER_BONUS
  bonus += params.stageWins * STAGE_WIN_BONUS
  if (params.homePodium) bonus += HOME_PODIUM_BONUS
  return bonus
}

interface PickScore {
  isWildcard: boolean
  finishPosition: number | null
  dnsDnf: boolean
  basePoints: number
  bonusPoints: number
}

export function computeTeamTotal(params: {
  picks: PickScore[]
  salaryCap: number
  totalCost: number
}): {
  basePoints: number
  bonusPoints: number
  wildcardBonus: number
  perfectRoundBonus: number
  totalPoints: number
  isOverBudget: boolean
} {
  const isOverBudget = params.totalCost > params.salaryCap

  const basePoints = params.picks.reduce((s, p) => s + p.basePoints, 0)
  const bonusPoints = params.picks.reduce((s, p) => s + p.bonusPoints, 0)

  const wildcardBonus = params.picks
    .filter(p => p.isWildcard && p.finishPosition !== null && p.finishPosition <= 10 && !p.dnsDnf)
    .length * WILDCARD_TOP10_BONUS

  const allTop20 =
    params.picks.length === 6 &&
    params.picks.every(p => !p.dnsDnf && p.finishPosition !== null && p.finishPosition <= 20)
  const perfectRoundBonus = allTop20 ? PERFECT_ROUND_BONUS : 0

  const totalPoints = isOverBudget
    ? 0
    : basePoints + bonusPoints + wildcardBonus + perfectRoundBonus

  return { basePoints, bonusPoints, wildcardBonus, perfectRoundBonus, totalPoints, isOverBudget }
}
