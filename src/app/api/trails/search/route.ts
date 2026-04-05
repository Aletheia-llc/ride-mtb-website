import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line no-restricted-imports
import { searchTrails } from '@/modules/trails/lib/queries'

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const trails = await searchTrails(query, 10)

    const results = trails.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      systemName: t.system.name,
      systemSlug: t.system.slug,
      location: [t.system.city, t.system.state].filter(Boolean).join(', '),
      difficulty: t.physicalDifficulty,
      distance: t.distance,
    }))

    return NextResponse.json(results)
  } catch (err) {
    console.error('[api/trails/search]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
