// src/app/api/feed/click/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { recordFeedClick } from '@/modules/feed/lib/personalization'

const CLICK_INCREMENT_MAP: Record<string, number> = {
  trail: 1,
  'forum:': 1,
  events: 1,
  reviews: 1,
  buysell: 1,
  'learn:': 2,
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.category || typeof body.category !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { category } = body as { category: string }

  let inc = 1
  for (const [prefix, val] of Object.entries(CLICK_INCREMENT_MAP)) {
    if (category.startsWith(prefix)) { inc = val; break }
  }

  await recordFeedClick(session.user.id, category, inc)
  return NextResponse.json({ ok: true })
}
