import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEventsForMap, searchEvents, getEventsNearLocation } from './queries'

// Mock PrismaClient methods
vi.mock('@/lib/db/client', () => ({
  db: {
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  pool: {
    query: vi.fn(),
  },
}))

import { db, pool } from '@/lib/db/client'
// vi.mocked can't fully unwrap nested Prisma generic types; cast to any for mock assertions
const mockDb = db as unknown as { event: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> } }
const mockPool = pool as unknown as { query: ReturnType<typeof vi.fn> }

describe('getEventsForMap', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns published future events with coordinates', async () => {
    mockDb.event.findMany.mockResolvedValueOnce([
      { id: '1', slug: 'test-race', title: 'Test Race', startDate: new Date(), latitude: 40.0, longitude: -105.0, eventType: 'race', rsvpCount: 5 },
    ] as any)
    const result = await getEventsForMap()
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('test-race')
  })
})

describe('searchEvents', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns events matching query', async () => {
    mockDb.event.findMany.mockResolvedValueOnce([
      { id: '2', title: 'Enduro Race', slug: 'enduro-race', startDate: new Date(), eventType: 'race_enduro', status: 'published', city: 'Denver', state: 'CO', coverImageUrl: null, isFree: false, rsvpCount: 0 },
    ] as any)
    const result = await searchEvents({ query: 'enduro' })
    expect(result.events).toHaveLength(1)
    expect(result.events[0].slug).toBe('enduro-race')
  })
})

describe('getEventsNearLocation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns events within radius', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: '3', slug: 'nearby-race', title: 'Nearby Race', startDate: new Date(), eventType: 'race', status: 'published', city: 'Boulder', state: 'CO', coverImageUrl: null, isFree: false, rsvpCount: 0 }],
    } as any)
    const result = await getEventsNearLocation({ latitude: 40.0, longitude: -105.0, radiusKm: 50 })
    expect(result).toHaveLength(1)
  })
})
