import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { getCartItemCount } from '@/modules/merch/lib/cart-queries'

export async function CartIcon() {
  const session = await auth()
  const count = session?.user?.id ? await getCartItemCount(session.user.id) : 0

  return (
    <Link
      href="/merch/cart"
      className="relative inline-flex items-center justify-center p-2"
      aria-label={`Cart (${count} items)`}
    >
      <ShoppingCart className="w-5 h-5" style={{ color: 'var(--color-text)' }} />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
          style={{ background: 'var(--color-primary)' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
