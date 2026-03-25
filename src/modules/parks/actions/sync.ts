// src/modules/parks/actions/sync.ts
'use server'

import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { FACILITY_QUERIES, runOverpassQuery, parseOsmElement } from '../lib/overpass'

export async function getSyncState() {
  return db.syncState.upsert({
    where: { id: 'parks-sync' },
    create: { id: 'parks-sync' },
    update: {},
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function syncFacilitiesFromOSM(): Promise<{
  added: number
  updated: number
}> {
  await requireAdmin()

  const syncState = await db.syncState.findUnique({ where: { id: 'parks-sync' } })
  if (syncState?.syncInProgress) {
    throw new Error('Sync already in progress')
  }

  await db.syncState.upsert({
    where: { id: 'parks-sync' },
    create: { id: 'parks-sync', syncInProgress: true },
    update: { syncInProgress: true },
  })

  let added = 0
  let updated = 0

  try {
    for (let i = 0; i < FACILITY_QUERIES.length; i++) {
      if (i > 0) await sleep(2000)

      const { type, query } = FACILITY_QUERIES[i]!

      const elements = await runOverpassQuery(query)

      for (const element of elements) {
        const facility = parseOsmElement(element as Record<string, unknown>, type)
        if (!facility) continue

        const existing = await db.facility.findUnique({ where: { osmId: facility.osmId } })

        await db.facility.upsert({
          where: { osmId: facility.osmId },
          create: {
            osmId: facility.osmId,
            type: facility.type,
            name: facility.name,
            slug: facility.slug,
            latitude: facility.latitude,
            longitude: facility.longitude,
            address: facility.address,
            city: facility.city,
            state: facility.state,
            stateSlug: facility.stateSlug,
            operator: facility.operator,
            openingHours: facility.openingHours,
            surface: facility.surface,
            website: facility.website,
            phone: facility.phone,
            lit: facility.lit,
            fee: facility.fee,
            metadata: facility.metadata,
            lastSyncedAt: new Date(),
          },
          update: {
            name: facility.name,
            latitude: facility.latitude,
            longitude: facility.longitude,
            address: facility.address,
            city: facility.city,
            state: facility.state,
            stateSlug: facility.stateSlug,
            operator: facility.operator,
            openingHours: facility.openingHours,
            surface: facility.surface,
            website: facility.website,
            phone: facility.phone,
            lit: facility.lit,
            fee: facility.fee,
            metadata: facility.metadata,
            lastSyncedAt: new Date(),
          },
        })

        if (existing) {
          updated++
        } else {
          added++
        }
      }
    }

    const result = { added, updated }
    await db.syncState.update({
      where: { id: 'parks-sync' },
      data: {
        syncInProgress: false,
        lastSyncedAt: new Date(),
        lastSyncResult: result,
      },
    })
    return result
  } catch (err) {
    await db.syncState.update({
      where: { id: 'parks-sync' },
      data: {
        syncInProgress: false,
        lastSyncResult: { error: err instanceof Error ? err.message : 'Unknown error' },
      },
    })
    throw err
  }
}
