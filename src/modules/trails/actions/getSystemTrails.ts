'use server'
import { getSystemTrailsForMap } from '@/modules/trails/lib/queries'

export async function getSystemTrailsAction(systemId: string) {
  if (!systemId || typeof systemId !== 'string') return []
  return getSystemTrailsForMap(systemId)
}
