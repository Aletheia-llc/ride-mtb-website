import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { source } = await request.json()
    return NextResponse.json({ imported: 0, duplicates: 0, source })
  } catch (error) {
    console.error('POST /api/import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
