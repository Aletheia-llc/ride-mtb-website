'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { removeFromCart, updateCartQuantity } from '@/modules/merch/actions/cart'

type CartItem = {
  id: string
  quantity: number
  variantKey: string
  product: {
    id: string
    name: string
    slug: string
    price: number
    imageUrls: unknown
    inStock: boolean
    variants: unknown
  }
}

interface CartPageClientProps {
  items: CartItem[]
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}

function CartLineItem({ item }: { item: CartItem }) {
  const imageUrls = item.product.imageUrls as string[]
  const firstImage = imageUrls?.[0] ?? null

  const [removeState, removeAction, removePending] = useActionState(
    async (_prev: null, _formData: FormData) => {
      await removeFromCart(item.id)
      return null
    },
    null,
  )

  const [_qtyState, qtyAction, qtyPending] = useActionState(
    async (_prev: null, formData: FormData) => {
      const qty = parseInt(formData.get('quantity') as string, 10)
      await updateCartQuantity(item.id, qty)
      return null
    },
    null,
  )

  void removeState

  return (
    <div className="flex gap-4 py-4 border-b border-[var(--color-border)]">
      {firstImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={firstImage}
          alt={item.product.name}
          className="w-20 h-20 object-cover rounded"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--color-text)] truncate">{item.product.name}</p>
        {item.variantKey !== 'default' && (
          <p className="text-sm text-[var(--color-text-muted)]">{item.variantKey}</p>
        )}
        <p className="text-sm font-semibold text-[var(--color-text)] mt-1">
          {formatPrice(item.product.price)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <form action={qtyAction} className="flex items-center gap-1">
          <label htmlFor={`qty-${item.id}`} className="sr-only">Quantity</label>
          <input
            id={`qty-${item.id}`}
            name="quantity"
            type="number"
            min={1}
            max={99}
            defaultValue={item.quantity}
            className="w-14 text-center border border-[var(--color-border)] rounded px-2 py-1 text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
          />
          <button
            type="submit"
            disabled={qtyPending}
            className="text-xs px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-50"
          >
            Update
          </button>
        </form>
        <form action={removeAction}>
          <button
            type="submit"
            disabled={removePending}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            Remove
          </button>
        </form>
      </div>
    </div>
  )
}

export function CartPageClient({ items }: CartPageClientProps) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--color-text-muted)] text-lg">Your cart is empty.</p>
        <Link
          href="/merch"
          className="mt-4 inline-block px-6 py-2 rounded font-medium text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Browse Merch
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="divide-y divide-[var(--color-border)]">
        {items.map((item) => (
          <CartLineItem key={item.id} item={item} />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <div className="text-right">
          <p className="text-sm text-[var(--color-text-muted)]">Subtotal</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">{formatPrice(subtotal)}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Shipping and taxes calculated at checkout
          </p>
          <button
            className="mt-4 w-full px-8 py-3 rounded font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
            disabled
            title="Checkout coming soon"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  )
}
