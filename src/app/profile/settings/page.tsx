import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { Card } from '@/ui/components'
import { ProfileForm } from '@/modules/profile'
// eslint-disable-next-line no-restricted-imports
import { getUserProfile } from '@/modules/profile/lib/queries'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Edit Profile | Ride MTB',
}

export default async function ProfileSettingsPage() {
  const sessionUser = await requireAuth()
  const profile = await getUserProfile(sessionUser.id)

  if (!profile) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Edit Profile</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Update your profile information visible to other riders.
        </p>
      </div>

      <Card>
        <ProfileForm user={profile} />
      </Card>
    </div>
  )
}
