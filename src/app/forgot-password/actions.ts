'use server'

import crypto from 'crypto'
import { db } from '@/lib/db/client'
import { sendPasswordResetEmail } from '@/lib/email/password-reset'

export type ForgotPasswordState = { success?: boolean; error?: string } | null

export async function requestPasswordReset(
  prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!email) return { error: 'Email is required.' }

  // Always return success to prevent email enumeration
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  })

  // Only send reset email if account exists and uses password auth
  if (user?.passwordHash) {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Delete any existing password reset tokens for this email
    await db.verificationToken.deleteMany({ where: { identifier: `pw:${email}` } })

    await db.verificationToken.create({
      data: { identifier: `pw:${email}`, token, expires },
    })

    await sendPasswordResetEmail(email, token)
  }

  return { success: true }
}
