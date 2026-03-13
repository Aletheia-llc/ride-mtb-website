import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
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
  try {
    await deleteListing(id, session.user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    const status_code = message.includes('Not authorized') ? 403 : message.includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status: status_code })
  }
}
