import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { toggleTrailFavorite } from '@/modules/trails/lib/queries'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ trailId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { trailId } = await params

  if (!trailId) {
    return NextResponse.json({ error: 'Trail ID is required' }, { status: 400 })
  }

  const result = await toggleTrailFavorite(trailId, session.user.id)

  return NextResponse.json(result)
}
