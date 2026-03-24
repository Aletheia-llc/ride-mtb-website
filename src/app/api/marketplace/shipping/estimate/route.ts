import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { listingId, toZip } = await req.json()

  if (!listingId || !toZip) {
    return NextResponse.json({ error: 'listingId and toZip are required' }, { status: 400 })
  }

  try {
    const { estimateShipping } = await import('@/modules/marketplace/actions/shipping')
    const rates = await estimateShipping(listingId, toZip)
    return NextResponse.json({ rates })
  } catch (error) {
    console.error('[api/marketplace/shipping/estimate]', error)
    return NextResponse.json({ error: 'Failed to estimate shipping' }, { status: 500 })
  }
}
