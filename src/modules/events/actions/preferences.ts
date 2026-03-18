'use server'

import { auth } from '@/lib/auth/config'
import { getUserEventPreference, upsertUserEventPreference } from '../lib/queries'
import type { UserEventPreferenceData } from '../types'

export async function getMyEventPreferences() {
  const session = await auth()
  if (!session?.user?.id) return null
  return getUserEventPreference(session.user.id)
}

export async function updateMyEventPreferences(data: UserEventPreferenceData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')
  return upsertUserEventPreference(session.user.id, data)
}
