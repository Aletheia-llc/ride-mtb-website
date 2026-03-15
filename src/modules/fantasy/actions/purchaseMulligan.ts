// src/modules/fantasy/actions/purchaseMulligan.ts
'use server'

import { auth } from '@/lib/auth'
import { createMulliganCheckout } from '@/modules/fantasy/lib/stripe'
import type { MulliganPack } from '@/modules/fantasy/lib/stripe'
import { redirect } from 'next/navigation'

export async function purchaseMulligan(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const pack = formData.get('pack') as MulliganPack
  const returnUrl = formData.get('returnUrl') as string

  if (!pack || !returnUrl || (pack !== '1' && pack !== '3')) {
    throw new Error('Invalid pack selection')
  }

  const checkoutUrl = await createMulliganCheckout({
    userId: session.user.id,
    pack,
    returnUrl,
  })

  redirect(checkoutUrl)
}
