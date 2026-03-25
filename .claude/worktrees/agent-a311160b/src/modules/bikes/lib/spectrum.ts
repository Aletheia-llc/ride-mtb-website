import type { QuizAnswers, AlternativeResult, ScoreBreakdown, SpectrumResult } from '../types'
import {
  TERRAIN_VALUES,
  RIDE_DAY_VALUES,
  PRIORITY_MODIFIERS,
  CATEGORY_META,
  WHEEL_SIZE_MATRIX,
  GENERIC_SIZE_CHART,
  type WheelConfig,
} from './constants'

export function computeTerrainBase(terrain: string[]): number {
  if (terrain.length === 0) return 5
  const sum = terrain.reduce((acc, t) => acc + (TERRAIN_VALUES[t] ?? 5), 0)
  return sum / terrain.length
}

export function computeRideDayBlend(terrainBase: number, rideDay: string): number {
  if (!rideDay || !(rideDay in RIDE_DAY_VALUES)) return terrainBase
  return (terrainBase + RIDE_DAY_VALUES[rideDay]) / 2
}

export function applyPrioritiesModifier(score: number, priorities: string[]): number {
  if (priorities.length === 0) return score
  const sum = priorities.reduce((acc, p) => acc + (PRIORITY_MODIFIERS[p] ?? 0), 0)
  return score + sum / priorities.length
}

export function applyPedalingModifier(score: number, pedalingEnjoyment: number): number {
  // pedalingEnjoyment: 1-10 (1 = hates pedaling, 10 = loves it)
  // High enjoyment shifts toward XC/gravel (lower), low shifts toward gravity (higher)
  // 5 is neutral (0 modifier), range is roughly -1 to +0.8
  return score + (5 - pedalingEnjoyment) * 0.2
}

export function applyExperienceModifier(
  score: number,
  experience: string,
  priorities: string[],
): number {
  if (experience !== 'expert') return score
  const hasLightPref = priorities.some((p) => p === 'distance' || p === 'lightweight')
  return hasLightPref ? score - 1 : score
}

export function roundToNearestOdd(value: number): number {
  const clamped = Math.max(1, Math.min(9, value))
  const oddNumbers = [1, 3, 5, 7, 9]
  let closest = oddNumbers[0]
  let minDist = Math.abs(clamped - closest)
  for (let i = 1; i < oddNumbers.length; i++) {
    const dist = Math.abs(clamped - oddNumbers[i])
    if (dist < minDist) {
      minDist = dist
      closest = oddNumbers[i]
    }
  }
  return closest
}

export function lookupWheelConfig(heightInches: number, categoryNumber: number): WheelConfig {
  for (const row of WHEEL_SIZE_MATRIX) {
    if (heightInches < row.maxHeight) {
      return row.configs[categoryNumber] ?? '29/29'
    }
  }
  const lastRow = WHEEL_SIZE_MATRIX[WHEEL_SIZE_MATRIX.length - 1]
  return lastRow.configs[categoryNumber] ?? '29/29'
}

function getFrameSize(heightInches: number): string {
  for (const [size, range] of Object.entries(GENERIC_SIZE_CHART)) {
    if (heightInches >= range.minHeight && heightInches < range.maxHeight) {
      return size
    }
  }
  if (heightInches >= 79) return 'XXL'
  return 'M'
}

function getFitNotes(heightInches: number, weightLbs: number): string[] {
  const notes: string[] = []
  if (weightLbs > 250) {
    notes.push('Consider bikes with reinforced frames and higher weight capacity.')
  }
  for (const [size, range] of Object.entries(GENERIC_SIZE_CHART)) {
    if (heightInches === range.maxHeight) {
      const sizes = Object.keys(GENERIC_SIZE_CHART)
      const idx = sizes.indexOf(size)
      if (idx < sizes.length - 1) {
        notes.push(`You're between ${size} and ${sizes[idx + 1]}. We recommend test riding both.`)
      }
    }
  }
  return notes
}

function generateAlternatives(primaryCategory: number): AlternativeResult[] {
  const alternatives: AlternativeResult[] = []
  const lower = primaryCategory - 2
  const upper = primaryCategory + 2

  if (lower >= 1 && CATEGORY_META[lower]) {
    const meta = CATEGORY_META[lower]
    alternatives.push({
      categoryNumber: lower,
      categoryName: meta.name,
      reason:
        lower <= 3
          ? 'Consider this if you prioritize long rides and pedaling efficiency'
          : 'Consider this if you want a lighter, more nimble ride',
    })
  }

  if (upper <= 9 && CATEGORY_META[upper]) {
    const meta = CATEGORY_META[upper]
    alternatives.push({
      categoryNumber: upper,
      categoryName: meta.name,
      reason:
        upper >= 7
          ? 'Consider this if you want more downhill capability and stability'
          : 'Consider this if you ride more technical terrain',
    })
  }

  return alternatives
}

function generateWhyMatches(answers: QuizAnswers, primaryCategory: number): string[] {
  const meta = CATEGORY_META[primaryCategory]
  if (!meta) return ['A solid match for your riding profile']

  const reasons: string[] = []

  if (answers.terrain.length > 0) {
    const terrainLabels: Record<string, string> = {
      paved: 'paved paths',
      smooth: 'smooth trails',
      rocky: 'rocky terrain',
      technical: 'technical terrain',
      bikepark: 'bike parks',
    }
    const terrainNames = answers.terrain.map((t) => terrainLabels[t] || t)
    reasons.push(`${meta.name} bikes are well-suited for ${terrainNames.join(' and ')}`)
  }

  const rideDayLabels: Record<string, string> = {
    scenic: 'your preference for long, scenic rides',
    flowy: 'your love of flowy trails',
    balanced: 'your balanced approach to climbing and descending',
    challenging: 'your appetite for challenging terrain',
    downhill: 'your focus on downhill riding',
  }
  if (answers.ride_day && rideDayLabels[answers.ride_day]) {
    reasons.push(`Great match for ${rideDayLabels[answers.ride_day]}`)
  }

  if (reasons.length === 0) {
    reasons.push(`${meta.name} is a solid match for your riding profile`)
  }

  return reasons
}

export function computeSpectrumCategory(answers: QuizAnswers): SpectrumResult {
  const terrainBase = computeTerrainBase(answers.terrain)
  const blended = computeRideDayBlend(terrainBase, answers.ride_day)
  const withPriorities = applyPrioritiesModifier(blended, answers.priorities)
  const pedalingEnjoyment = answers.preferences?.pedaling_enjoyment ?? 5
  const withPedaling = applyPedalingModifier(withPriorities, pedalingEnjoyment)
  const pedalingMod = withPedaling - withPriorities
  const rawScore = applyExperienceModifier(withPedaling, answers.experience, answers.priorities)
  const experienceMod = rawScore - withPedaling
  const primaryCategory = roundToNearestOdd(rawScore)
  const meta = CATEGORY_META[primaryCategory] ?? CATEGORY_META[5]
  const wheelConfig = lookupWheelConfig(answers.sizing.height_inches, primaryCategory)
  const recommendedSize = getFrameSize(answers.sizing.height_inches)
  const fitNotes = getFitNotes(answers.sizing.height_inches, answers.sizing.weight_lbs)
  const alternatives = generateAlternatives(primaryCategory)
  const whyMatches = generateWhyMatches(answers, primaryCategory)
  const budget = answers.preferences?.budget ?? 5000
  const ebike = answers.preferences?.ebike ?? false

  if (ebike) {
    fitNotes.push('E-bike selected — look for electric models in your recommended category.')
  }

  if (pedalingEnjoyment >= 8) {
    whyMatches.push('Your love of pedaling is factored into this recommendation')
  } else if (pedalingEnjoyment <= 3) {
    whyMatches.push('Optimized for less pedaling with more gravity-focused riding')
  }

  const scoreBreakdown: ScoreBreakdown = {
    terrainBase,
    terrainInputs: answers.terrain,
    rideDayBlend: blended,
    rideDayInput: answers.ride_day,
    afterPriorities: withPriorities,
    priorityInputs: answers.priorities,
    pedalingModifier: pedalingMod,
    pedalingInput: pedalingEnjoyment,
    experienceModifier: experienceMod,
    experienceInput: answers.experience,
    rawScore,
    finalCategory: primaryCategory,
  }

  return {
    primaryCategory,
    rawScore,
    categoryName: meta.name,
    categoryDescription: meta.description,
    travelRange: meta.travelRange,
    wheelConfig,
    recommendedSize,
    fitNotes,
    whyMatches,
    alternatives,
    budget,
    ebike,
    scoreBreakdown,
  }
}
