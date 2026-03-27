import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { rateLimit } from '@/lib/rate-limit'
import { LeadEventType } from '@/generated/prisma/client'

const schema = z.object({
  eventType: z.nativeEnum(LeadEventType),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headersList.get('x-real-ip') ??
      'anonymous'

    await rateLimit({ identifier: ip, action: `shop-track:${slug}`, maxPerMinute: 3 })

    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({}, { status: 200 }) // silent drop

    const shop = await db.shop.findUnique({ where: { slug }, select: { id: true } })
    if (!shop) return NextResponse.json({}, { status: 200 }) // silent drop

    await db.leadEvent.create({
      data: { shopId: shop.id, eventType: parsed.data.eventType },
    })

    return NextResponse.json({}, { status: 200 })
  } catch {
    // Silent drop — never surface errors to client
    return NextResponse.json({}, { status: 200 })
  }
}
