import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await auth()

    // eslint-disable-next-line no-restricted-imports
    const { db } = await import('@/lib/db/client')

    const link = await db.affiliateLink.findUnique({
      where: { slug, isActive: true },
      select: { id: true, url: true },
    })

    if (!link) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Record click asynchronously (don't block redirect)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = request.headers.get('user-agent') ?? null
    const referrer = request.headers.get('referer') ?? null

    db.affiliateClick.create({
      data: {
        linkId: link.id,
        userId: session?.user?.id ?? null,
        ip,
        userAgent,
        referrer,
      },
    }).catch(() => {}) // fire-and-forget

    return NextResponse.redirect(link.url, { status: 302 })
  } catch (error) {
    console.error('Affiliate track error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
