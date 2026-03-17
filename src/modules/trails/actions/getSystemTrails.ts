'use server'
import { getSystemTrailsForMap } from '@/modules/trails/lib/queries'

export async function getSystemTrailsAction(systemId: string) {
  return getSystemTrailsForMap(systemId)
}
