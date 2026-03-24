// src/modules/bikes/actions/garage-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

const BIKE_CATEGORIES = ['gravel', 'xc', 'trail', 'enduro', 'downhill', 'dirt_jump', 'ebike', 'other'] as const
const COMPONENT_CATEGORIES = ['FRAME', 'FORK', 'SHOCK', 'WHEELS', 'DRIVETRAIN', 'BRAKES', 'COCKPIT', 'SEATPOST', 'SADDLE', 'PEDALS', 'OTHER'] as const

// ── duplicateBike ─────────────────────────────────────────────

export async function duplicateBike(bikeId: string): Promise<{ bikeId: string }> {
  const user = await requireAuth()

  const original = await db.userBike.findFirst({
    where: { id: bikeId, userId: user.id },
    include: { components: true },
  })
  if (!original) throw new Error('Bike not found')

  const { id, createdAt, updatedAt, components, ...bikeData } = original

  const newBike = await db.$transaction(async (tx) => {
    const bike = await tx.userBike.create({
      data: {
        ...bikeData,
        name: `${bikeData.name} (copy)`,
        isPrimary: false,
      },
    })

    for (const { id: _cId, bikeId: _bId, createdAt: _cCa, ...componentData } of components) {
      await tx.bikeComponent.create({
        data: { ...componentData, bikeId: bike.id },
      })
    }

    return bike
  })

  revalidatePath('/bikes/garage')
  return { bikeId: newBike.id }
}

// ── exportBike ────────────────────────────────────────────────

export interface BikeExportData {
  exportedAt: string
  version: 1
  bike: {
    name: string; brand: string; model: string; year: number | null
    category: string | null; wheelSize: string | null; frameSize: string | null
    frameMaterial: string | null; travel: number | null; weight: number | null
    purchaseYear: number | null; purchasePrice: number | null; notes: string | null
  }
  components: {
    category: string; brand: string; model: string; year: number | null
    weightGrams: number | null; priceCents: number | null; notes: string | null
    isActive: boolean
  }[]
  buildLog: { title: string; description: string | null; entryDate: string }[]
}

export async function exportBike(bikeId: string): Promise<BikeExportData> {
  const user = await requireAuth()

  const bike = await db.userBike.findFirst({
    where: { id: bikeId, userId: user.id },
    include: {
      components: true,
      buildLog: { orderBy: { entryDate: 'asc' } },
    },
  })
  if (!bike) throw new Error('Bike not found')

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    bike: {
      name: bike.name,
      brand: bike.brand,
      model: bike.model,
      year: bike.year,
      category: bike.category,
      wheelSize: bike.wheelSize,
      frameSize: bike.frameSize,
      frameMaterial: bike.frameMaterial,
      travel: bike.travel,
      weight: bike.weight,
      purchaseYear: bike.purchaseYear,
      purchasePrice: bike.purchasePrice,
      notes: bike.notes,
    },
    components: bike.components.map(c => ({
      category: c.category,
      brand: c.brand,
      model: c.model,
      year: c.year,
      weightGrams: c.weightGrams,
      priceCents: c.priceCents,
      notes: c.notes,
      isActive: c.isActive,
    })),
    buildLog: bike.buildLog.map(e => ({
      title: e.title,
      description: e.description,
      entryDate: e.entryDate.toISOString(),
    })),
  }
}

// ── importBike ────────────────────────────────────────────────

export async function importBike(jsonString: string): Promise<{ bikeId: string }> {
  const user = await requireAuth()

  let data: unknown
  try {
    data = JSON.parse(jsonString)
  } catch {
    throw new Error('Invalid JSON file')
  }

  if (typeof data !== 'object' || data === null || !('version' in data)) {
    throw new Error('Invalid export file format')
  }

  const d = data as BikeExportData
  if (d.version !== 1) throw new Error('Unsupported export version')
  if (typeof d.bike?.name !== 'string' || !d.bike.name.trim()) throw new Error('Missing bike name')

  if (d.bike.category && !BIKE_CATEGORIES.includes(d.bike.category as typeof BIKE_CATEGORIES[number])) {
    throw new Error(`Invalid bike category: ${d.bike.category}`)
  }
  for (const c of d.components ?? []) {
    if (!COMPONENT_CATEGORIES.includes(c.category as typeof COMPONENT_CATEGORIES[number])) {
      throw new Error(`Invalid component category: ${c.category}`)
    }
  }

  const newBike = await db.$transaction(async (tx) => {
    const bike = await tx.userBike.create({
      data: {
        userId: user.id,
        name: d.bike.name.trim(),
        brand: d.bike.brand ?? 'Unknown',
        model: d.bike.model ?? 'Unknown',
        year: d.bike.year ?? null,
        category: (d.bike.category as (typeof BIKE_CATEGORIES[number])) ?? 'other',
        wheelSize: d.bike.wheelSize ?? null,
        frameSize: d.bike.frameSize ?? null,
        frameMaterial: d.bike.frameMaterial ?? null,
        travel: d.bike.travel ?? null,
        weight: d.bike.weight ?? null,
        purchaseYear: d.bike.purchaseYear ?? null,
        purchasePrice: d.bike.purchasePrice ?? null,
        notes: d.bike.notes ?? null,
        isPrimary: false,
      },
    })

    for (const c of d.components ?? []) {
      await tx.bikeComponent.create({
        data: {
          bikeId: bike.id,
          category: c.category as typeof COMPONENT_CATEGORIES[number],
          brand: c.brand ?? 'Unknown',
          model: c.model ?? 'Unknown',
          year: c.year ?? null,
          weightGrams: c.weightGrams ?? null,
          priceCents: c.priceCents ?? null,
          notes: c.notes ?? null,
          isActive: c.isActive ?? true,
        },
      })
    }

    for (const e of d.buildLog ?? []) {
      if (typeof e.title === 'string' && e.title.trim()) {
        await tx.buildLogEntry.create({
          data: {
            bikeId: bike.id,
            userId: user.id,
            title: e.title.trim(),
            description: e.description ?? null,
            entryDate: new Date(e.entryDate),
          },
        })
      }
    }

    return bike
  })

  revalidatePath('/bikes/garage')
  return { bikeId: newBike.id }
}
