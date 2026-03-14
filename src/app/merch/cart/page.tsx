import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getCartItems } from '@/modules/merch/lib/cart-queries'
import { CartPageClient } from '@/modules/merch/components/CartPageClient'

export const metadata: Metadata = {
  title: 'Cart | Ride MTB Merch',
}

export default async function CartPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const items = await getCartItems(session.user.id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-[var(--color-text)]">Your Cart</h1>
      <CartPageClient items={items} />
    </div>
  )
}
