import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { fetchBikeRegEvents } from '@/modules/events/lib/import/bikereg'
import { fetchUSACEvents } from '@/modules/events/lib/import/usac'
import { dedupAndInsert } from '@/modules/events/lib/import/dedup'

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
    if (!source) return NextResponse.json({ error: 'source required' }, { status: 400 })
    const events = source === 'bikereg' ? await fetchBikeRegEvents()
                 : source === 'usac'    ? await fetchUSACEvents()
                 : []
    const result = await dedupAndInsert(events)
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
