import { notFound } from 'next/navigation'
import { Card } from '@/ui/components'
import { ProfileHeader, XPOverview, ActivityFeed, ProfileStats } from '@/modules/profile'
// eslint-disable-next-line no-restricted-imports
import { getUserByUsername, getRecentActivity } from '@/modules/profile/lib/queries'

import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getUserByUsername(username)

  if (!profile) {
    return { title: 'Profile Not Found | Ride MTB' }
  }

  const displayName = profile.name || profile.username || 'Rider'
  return {
    title: `${displayName} | Ride MTB`,
    description: profile.bio || `${displayName}'s rider profile on Ride MTB`,
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params
  const profile = await getUserByUsername(username)

  if (!profile) notFound()

  const activities = await getRecentActivity(profile.id, 10)

  return (
    <div className="space-y-6">
      <Card>
        <ProfileHeader user={profile} />
      </Card>

      <ProfileStats counts={profile._count} />

      <XPOverview xpAggregate={profile.xpAggregate} />

      {activities.length > 0 && <ActivityFeed activities={activities} />}
    </div>
  )
}
