'use client'
import { useActionState } from 'react'
import { ShopType } from '@/generated/prisma/client'
import type { UpdateShopState } from '../../actions/updateShop'

const SHOP_TYPES = Object.values(ShopType)

interface ShopData {
  name: string
  shopType: string
  description?: string | null
  address: string
  city: string
  state: string
  zipCode?: string | null
  phone?: string | null
  email?: string | null
  websiteUrl?: string | null
  services: string[]
  brands: string[]
}

interface Props {
  shop: ShopData
  action: (prev: UpdateShopState, formData: FormData) => Promise<UpdateShopState>
}

export function EditTab({ shop, action }: Props) {
  const [state, formAction, pending] = useActionState(action, { errors: {} })

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Shop Name *</label>
        <input name="name" defaultValue={shop.name} className="input w-full" required />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Shop Type</label>
        <select name="shopType" className="input w-full" defaultValue={shop.shopType}>
          {SHOP_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea name="description" defaultValue={shop.description ?? ''} className="input w-full min-h-[100px]" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Street Address *</label>
        <input name="address" defaultValue={shop.address} className="input w-full" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">City *</label>
          <input name="city" defaultValue={shop.city} className="input w-full" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State *</label>
          <input name="state" defaultValue={shop.state} className="input w-full" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">ZIP Code</label>
        <input name="zipCode" defaultValue={shop.zipCode ?? ''} className="input w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input name="phone" type="tel" defaultValue={shop.phone ?? ''} className="input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input name="email" type="email" defaultValue={shop.email ?? ''} className="input w-full" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Website</label>
        <input name="websiteUrl" type="url" defaultValue={shop.websiteUrl ?? ''} className="input w-full" placeholder="https://" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Services (comma-separated)</label>
        <input
          name="services"
          defaultValue={shop.services.join(', ')}
          className="input w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Brands (comma-separated)</label>
        <input
          name="brands"
          defaultValue={shop.brands.join(', ')}
          className="input w-full"
        />
      </div>

      {state.errors.general && (
        <p className="text-red-600 text-sm">{state.errors.general}</p>
      )}
      {state.success && (
        <p className="text-green-600 text-sm">Changes saved.</p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
