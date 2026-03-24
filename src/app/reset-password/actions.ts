'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export type ResetPasswordState = { error?: string } | null

export async function resetPassword(
  token: string,
  prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirm) return { error: 'Passwords do not match.' }
  if (!token) return { error: 'Invalid or missing reset token.' }

  const record = await db.verificationToken.findFirst({ where: { token, identifier: { startsWith: 'pw:' } } })

  if (!record) return { error: 'This reset link is invalid or has already been used.' }
  if (record.expires < new Date()) return { error: 'This reset link has expired. Please request a new one.' }

  const email = record.identifier.replace(/^pw:/, '')
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })
  if (!user) return { error: 'Account not found.' }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.verificationToken.delete({ where: { token } }),
  ])

  try {
    await signIn('credentials', { email: user.email, password, redirectTo: '/dashboard' })
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/signin?reset=success')
    }
    throw error
  }

  return null
}
