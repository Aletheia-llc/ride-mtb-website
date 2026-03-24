import 'server-only'
import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { sendVerificationEmail } from '@/lib/email/verify-email'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Don't resend if already verified
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, email: true },
  })
  if (user?.emailVerified) {
    return NextResponse.json({ ok: true })
  }

  const email = user!.email!

  // Delete any existing verification tokens for this email
  await db.verificationToken.deleteMany({ where: { identifier: `verify:${email}` } })

  const token = crypto.randomBytes(32).toString('hex')
  await db.verificationToken.create({
    data: {
      identifier: `verify:${email}`,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  await sendVerificationEmail(email, token)

  return NextResponse.json({ ok: true })
}
