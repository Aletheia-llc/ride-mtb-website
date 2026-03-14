import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { validateInvite } from '@/modules/creators/lib/invites'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function CreatorOnboardingPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 400, textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            Invalid Invite
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            This invite link is missing or invalid. Contact the Ride MTB team for a new invite.
          </p>
        </div>
      </div>
    )
  }

  const inviteRecord = await validateInvite(token)
  if (!inviteRecord) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 400, textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            Invite Expired or Used
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            This invite link has expired or has already been used. Contact the Ride MTB team for a new invite.
          </p>
        </div>
      </div>
    )
  }

  const user = await requireAuth()

  // Idempotent: if profile already exists, skip to next step
  const existing = await db.creatorProfile.findUnique({ where: { userId: user.id } })
  if (existing) {
    redirect('/creators/onboarding/profile')
  }

  // Mark token used + create creator profile atomically
  await db.$transaction([
    db.inviteToken.update({
      where: { id: inviteRecord.id },
      data: { used: true, claimedByUserId: user.id },
    }),
    db.creatorProfile.create({
      data: {
        userId: user.id,
        displayName: user.name ?? user.email?.split('@')[0] ?? 'Creator',
        status: 'onboarding',
      },
    }),
  ])

  redirect('/creators/onboarding/profile')
}
