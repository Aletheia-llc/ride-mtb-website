import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { Card } from '@/ui/components'
import { ProfileHeader, XPOverview, ActivityFeed, ProfileStats } from '@/modules/profile'
// eslint-disable-next-line no-restricted-imports
import { getUserProfile, getRecentActivity } from '@/modules/profile/lib/queries'

export default async function ProfilePage() {
  const sessionUser = await requireAuth()

  const [profile, activities] = await Promise.all([
    getUserProfile(sessionUser.id),
    getRecentActivity(sessionUser.id),
  ])

  if (!profile) notFound()

  return (
    <div className="space-y-6">
      <Card>
        <ProfileHeader user={profile} isOwnProfile />
      </Card>

      <ProfileStats counts={profile._count} />

      <XPOverview xpAggregate={profile.xpAggregate} />

      <ActivityFeed activities={activities} />
    </div>
  )
}
