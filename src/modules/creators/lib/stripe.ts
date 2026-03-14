import 'server-only'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

export async function createStripeExpressAccount(): Promise<string> {
  const stripe = getStripe()
  const account = await stripe.accounts.create({ type: 'express' })
  return account.id
}

export async function createStripeOnboardingLink(
  stripeAccountId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<string> {
  const stripe = getStripe()
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: 'account_onboarding',
  })
  return link.url
}

export async function constructStripeEvent(body: string, signature: string) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  return stripe.webhooks.constructEvent(body, signature, secret)
}
