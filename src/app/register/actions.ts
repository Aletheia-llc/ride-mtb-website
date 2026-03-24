'use server'

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { sendVerificationEmail } from '@/lib/email/verify-email'

export type RegisterState = { error?: string } | null

export async function registerUser(
  callbackUrl: string,
  prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = (formData.get('email') as string).trim().toLowerCase()
  const username = (formData.get('username') as string).trim().toLowerCase()
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!email || !username || !password) return { error: 'All fields are required.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirm) return { error: 'Passwords do not match.' }
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: 'Username must be 3–20 characters: letters, numbers, or underscores.' }
  }

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  })
  if (existing?.email === email) return { error: 'An account with that email already exists.' }
  if (existing?.username === username) return { error: 'That username is taken.' }

  const passwordHash = await bcrypt.hash(password, 12)
  await db.user.create({
    data: { email, username, name: username, passwordHash },
  })

  // Send verification email (non-blocking — don't delay sign-in if it fails)
  try {
    const token = crypto.randomBytes(32).toString('hex')
    await db.verificationToken.create({
      data: { identifier: `verify:${email}`, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    })
    await sendVerificationEmail(email, token)
  } catch (e) {
    console.error('[register] Failed to send verification email:', e)
  }

  try {
    await signIn('credentials', { email, password, redirectTo: callbackUrl })
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Account created but sign-in failed. Please sign in manually.' }
    throw error
  }
  return null
}
