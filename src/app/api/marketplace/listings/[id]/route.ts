import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { deleteListing } from '@/modules/marketplace/lib/queries'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await deleteListing(id, session.user.id)
  return NextResponse.json({ ok: true })
}
