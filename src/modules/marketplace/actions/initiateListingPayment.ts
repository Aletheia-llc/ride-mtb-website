'use server'
import { requireAuth } from '@/lib/auth/guards'
import { redirect } from 'next/navigation'

export async function initiateListingPaymentAction(formData: FormData): Promise<void> {
  await requireAuth()

  const listingId = formData.get('listingId') as string
  const listingTitle = formData.get('listingTitle') as string

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

  const response = await fetch(`${BASE_URL}/api/marketplace/create-listing-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, listingTitle }),
  })

  const data = (await response.json()) as { url?: string; error?: string }

  if (data.url) {
    redirect(data.url)
  }
}
