import { requireAuth } from '@/lib/auth/guards'
import { getMySellerProfile } from '@/modules/marketplace/actions/seller'
import { StripeOnboarding } from '@/modules/marketplace/components/seller/StripeOnboarding'

export const metadata = {
  title: 'Seller Onboarding | Ride MTB Marketplace',
}

interface SellerOnboardingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SellerOnboardingPage({
  searchParams,
}: SellerOnboardingPageProps) {
  const user = await requireAuth()
  const sp = await searchParams

  const returnedFromStripe = sp.return === 'true'

  // Fetch or surface existing seller profile
  const profile = await getMySellerProfile()
  const isOnboarded = profile?.stripeOnboarded ?? false

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Become a Seller
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Set up your seller account to start listing your gear on Ride MTB
          Marketplace.
        </p>
      </div>

      {returnedFromStripe && !isOnboarded && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
          Stripe onboarding is not yet complete. Please finish setting up your
          account below.
        </div>
      )}

      {returnedFromStripe && isOnboarded && (
        <div className="mb-6 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-primary)]">
          Your Stripe account is connected! You can now create listings.
        </div>
      )}

      <StripeOnboarding isOnboarded={isOnboarded} userId={user.id!} />
    </div>
  )
}
