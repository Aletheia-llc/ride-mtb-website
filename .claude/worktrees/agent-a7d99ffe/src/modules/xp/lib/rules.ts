import { XP_VALUES, STREAK_MULTIPLIERS } from '@/shared/constants/xp-values'

export { XP_VALUES, STREAK_MULTIPLIERS }

export function getBasePoints(event: string): number {
  const points = XP_VALUES[event as keyof typeof XP_VALUES]
  if (typeof points !== 'number') {
    throw new Error(`Unknown XP event: ${event}`)
  }
  return points
}
