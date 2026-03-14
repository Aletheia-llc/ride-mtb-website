import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import {
  createStripeExpressAccount,
  createStripeOnboardingLink,
} from '@/modules/creators/lib/stripe'

export async function GET() {
  const session = await auth()
  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000'

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/signin', baseUrl))
  }

  const profile = await db.creatorProfile.findUnique({ where: { userId: session.user.id } })
  if (!profile) {
    return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })
  }

  try {
    let stripeAccountId = profile.stripeAccountId
    if (!stripeAccountId) {
      stripeAccountId = await createStripeExpressAccount()
      await db.creatorProfile.update({
        where: { id: profile.id },
        data: { stripeAccountId },
      })
    }

    const returnUrl = `${baseUrl}/creators/onboarding/complete`
    const refreshUrl = `${baseUrl}/api/creators/stripe-connect`
    const onboardingUrl = await createStripeOnboardingLink(stripeAccountId, returnUrl, refreshUrl)
    return NextResponse.redirect(onboardingUrl)
  } catch (err) {
    console.error('Stripe Connect error:', err)
    return NextResponse.redirect(`${baseUrl}/creators/onboarding/stripe?error=stripe_unavailable`)
  }
}
