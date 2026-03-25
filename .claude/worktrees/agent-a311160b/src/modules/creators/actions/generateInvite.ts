'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { generateInviteToken, hashToken } from '../lib/invites'

export type GenerateInviteState = {
  errors: Record<string, string>
  success?: boolean
  inviteUrl?: string
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function generateInvite(
  _prevState: GenerateInviteState,
  _formData: FormData,
): Promise<GenerateInviteState> {
  try {
    const admin = await requireAdmin()
    const rawToken = generateInviteToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

    await db.inviteToken.create({
      data: { tokenHash, createdByAdminId: admin.id, expiresAt, used: false },
    })

    revalidatePath('/admin/creators')

    const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000'
    return {
      errors: {},
      success: true,
      inviteUrl: `${baseUrl}/creators/onboarding?token=${rawToken}`,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return { errors: { general: 'Failed to generate invite. Please try again.' } }
  }
}
