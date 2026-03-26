import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { clearCart } from '@/modules/merch/actions/cart'

export const metadata = {
  title: 'Order Confirmed | Ride MTB Merch',
}

interface SuccessPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function MerchOrderSuccessPage({ searchParams }: SuccessPageProps) {
  await requireAuth()

  const sp = await searchParams
  const sessionId = typeof sp.session_id === 'string' ? sp.session_id : null

  // Clear the cart now that payment succeeded
  if (sessionId) {
    await clearCart()
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-9 w-9 text-green-500" />
      </div>

      <h1 className="mb-3 text-2xl font-bold text-[var(--color-text)]">Order Confirmed!</h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Thanks for your purchase. You&apos;ll receive a confirmation email with your order details
        and shipping info.
      </p>

      <div className="flex gap-3">
        <Link
          href="/merch"
          className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]"
        >
          Continue Shopping
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
