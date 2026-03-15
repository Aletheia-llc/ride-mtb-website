// src/modules/fantasy/actions/purchaseMulligan.ts
'use server'

import { auth } from '@/lib/auth'
import { createMulliganCheckout } from '@/modules/fantasy/lib/stripe'
import type { MulliganPack } from '@/modules/fantasy/lib/stripe'
import { redirect } from 'next/navigation'

export async function purchaseMulligan(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const pack = formData.get('pack') as MulliganPack
  const rawReturnUrl = formData.get('returnUrl') as string | null
  const baseUrl = process.env.AUTH_URL ?? ''
  const returnUrl = rawReturnUrl?.startsWith(baseUrl) ? rawReturnUrl : `${baseUrl}/fantasy`

  if (!pack || (pack !== '1' && pack !== '3')) {
    throw new Error('Invalid pack selection')
  }

  const checkoutUrl = await createMulliganCheckout({
    userId: session.user.id,
    pack,
    returnUrl,
  })

  redirect(checkoutUrl)
}
