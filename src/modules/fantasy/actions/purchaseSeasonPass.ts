// src/modules/fantasy/actions/purchaseSeasonPass.ts
'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { createSeasonPassCheckout } from '@/modules/fantasy/lib/stripe'
import { redirect } from 'next/navigation'

export async function purchaseSeasonPass(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const seriesId = formData.get('seriesId') as string
  const season = parseInt(formData.get('season') as string)
  const rawReturnUrl = formData.get('returnUrl') as string | null
  const baseUrl = process.env.AUTH_URL ?? ''
  const returnUrl = rawReturnUrl?.startsWith(baseUrl) ? rawReturnUrl : `${baseUrl}/fantasy`

  if (!seriesId || !season) {
    throw new Error('Missing required fields')
  }

  // Check not already purchased
  const existing = await db.seasonPassPurchase.findUnique({
    where: { userId_seriesId_season: { userId: session.user.id, seriesId, season } },
  })
  if (existing?.status === 'active') {
    redirect(returnUrl)
  }

  // Get series name for display
  const series = await db.fantasySeries.findUnique({
    where: { id: seriesId },
    select: { name: true },
  })
  if (!series) throw new Error('Series not found')

  const checkoutUrl = await createSeasonPassCheckout({
    userId: session.user.id,
    seriesId,
    season,
    seriesName: series.name,
    returnUrl,
  })

  redirect(checkoutUrl)
}
