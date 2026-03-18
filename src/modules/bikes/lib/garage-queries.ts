import 'server-only'
import { db } from '@/lib/db/client'
import type { BikeCategory } from '@/generated/prisma/client'

// ── Types ─────────────────────────────────────────────────────

interface CreateUserBikeInput {
  userId: string
  name: string
  brand: string
  model: string
  year?: number
  category: string
  wheelSize?: string
  frameSize?: string
  weight?: number
  imageUrl?: string
  isPrimary?: boolean
  notes?: string
}

interface UpdateUserBikeInput {
  name?: string
  brand?: string
  model?: string
  year?: number | null
  category?: string
  wheelSize?: string | null
  frameSize?: string | null
  weight?: number | null
  imageUrl?: string | null
  isPrimary?: boolean
  notes?: string | null
}

interface CreateServiceLogInput {
  bikeId: string
  serviceType: string
  description?: string
  cost?: number
  serviceDate: Date
  mileage?: number
}

// ── 1. getUserBikes ───────────────────────────────────────────

export async function getUserBikes(userId: string) {
  return db.userBike.findMany({
    where: { userId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { serviceLogs: true } },
    },
  })
}

// ── 2. getUserBikeById ────────────────────────────────────────

export async function getUserBikeById(bikeId: string, userId: string) {
  const bike = await db.userBike.findUnique({
    where: { id: bikeId },
    include: {
      serviceLogs: {
        orderBy: { serviceDate: 'desc' },
      },
      _count: { select: { serviceLogs: true } },
    },
  })

  if (!bike || bike.userId !== userId) return null

  return bike
}

// ── 3. createUserBike ─────────────────────────────────────────

export async function createUserBike(input: CreateUserBikeInput) {
  const { userId, isPrimary, ...data } = input

  if (isPrimary) {
    return db.$transaction(async (tx) => {
      await tx.userBike.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      })

      return tx.userBike.create({
        data: {
          ...data,
          userId,
          isPrimary: true,
          category: data.category as BikeCategory,
        },
      })
    })
  }

  return db.userBike.create({
    data: {
      ...data,
      userId,
      isPrimary: false,
      category: data.category as BikeCategory,
    },
  })
}

// ── 4. updateUserBike ─────────────────────────────────────────

export async function updateUserBike(
  bikeId: string,
  userId: string,
  input: UpdateUserBikeInput,
) {
  const bike = await db.userBike.findUnique({
    where: { id: bikeId },
    select: { userId: true },
  })

  if (!bike || bike.userId !== userId) return null

  const { isPrimary, category, ...rest } = input

  if (isPrimary) {
    return db.$transaction(async (tx) => {
      await tx.userBike.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      })

      return tx.userBike.update({
        where: { id: bikeId },
        data: {
          ...rest,
          isPrimary: true,
          ...(category !== undefined && { category: category as BikeCategory }),
        },
      })
    })
  }

  return db.userBike.update({
    where: { id: bikeId },
    data: {
      ...rest,
      ...(isPrimary !== undefined && { isPrimary }),
      ...(category !== undefined && { category: category as BikeCategory }),
    },
  })
}

// ── 5. deleteUserBike ─────────────────────────────────────────

export async function deleteUserBike(bikeId: string, userId: string) {
  const bike = await db.userBike.findUnique({
    where: { id: bikeId },
    select: { userId: true },
  })

  if (!bike || bike.userId !== userId) return false

  await db.userBike.delete({ where: { id: bikeId } })
  return true
}

// ── 6. createServiceLog ───────────────────────────────────────

export async function createServiceLog(input: CreateServiceLogInput) {
  return db.bikeServiceLog.create({
    data: input,
  })
}

// ── 7. getBikeWithDetails ─────────────────────────────────────

export async function getBikeWithDetails(bikeId: string, userId: string) {
  return db.userBike.findFirst({
    where: { id: bikeId, userId },
    include: {
      components: { where: { isActive: true }, orderBy: { category: 'asc' } },
      buildLog: { orderBy: { entryDate: 'desc' } },
      maintenanceTasks: { orderBy: { isDue: 'desc' } },
      serviceLogs: { orderBy: { serviceDate: 'desc' }, take: 5 },
    },
  })
}

// ── 8. deleteServiceLog ───────────────────────────────────────

export async function deleteServiceLog(logId: string, userId: string) {
  const log = await db.bikeServiceLog.findUnique({
    where: { id: logId },
    include: {
      bike: { select: { userId: true } },
    },
  })

  if (!log || log.bike.userId !== userId) return false

  await db.bikeServiceLog.delete({ where: { id: logId } })
  return true
}

// ── Types ─────────────────────────────────────────────────────

export interface BikeStats {
  bikeCount: number
  totalInvestmentDollars: number
  totalComponents: number
  bikeBreakdown: {
    id: string
    name: string
    brand: string
    category: string
    purchasePriceDollars: number
    componentCostDollars: number
    componentCount: number
    frameWeightLbs: number | null
    componentWeightGrams: number
    componentBrandSpend: Record<string, number>
  }[]
  categorySpending: Record<string, number>
  brandCounts: Record<string, number>
  componentBrandSpend: Record<string, number>
}

export interface BikeCompareData {
  id: string
  brand: string
  name: string
  year: number | null
  category: string | null
  wheelSize: string | null
  frameSize: string | null
  frameMaterial: string | null
  travel: number | null
  frameWeightLbs: number | null
  componentCount: number
  componentCostDollars: number
  totalInvestmentDollars: number
  purchaseYear: number | null
  purchasePriceDollars: number | null
  imageUrl: string | null
}

// ── 9. getBikeStats ───────────────────────────────────────────

export async function getBikeStats(userId: string): Promise<BikeStats> {
  const bikes = await db.userBike.findMany({
    where: { userId },
    include: { components: { where: { isActive: true } } },
  })

  const categorySpending: Record<string, number> = {}
  const brandCounts: Record<string, number> = {}
  const componentBrandSpend: Record<string, number> = {}

  const bikeBreakdown = bikes.map(bike => {
    const active = bike.components.filter(c => c.isActive)
    const componentCostDollars = active.reduce((sum, c) => sum + (c.priceCents ?? 0), 0) / 100
    const componentWeightGrams = active.reduce((sum, c) => sum + (c.weightGrams ?? 0), 0)

    const localBrandSpend: Record<string, number> = {}
    for (const c of active) {
      if (c.priceCents) {
        const dollars = c.priceCents / 100
        categorySpending[c.category] = (categorySpending[c.category] ?? 0) + dollars
        componentBrandSpend[c.brand] = (componentBrandSpend[c.brand] ?? 0) + dollars
        localBrandSpend[c.brand] = (localBrandSpend[c.brand] ?? 0) + dollars
      }
    }

    brandCounts[bike.brand] = (brandCounts[bike.brand] ?? 0) + 1

    return {
      id: bike.id,
      name: bike.name,
      brand: bike.brand,
      category: bike.category as string,
      purchasePriceDollars: bike.purchasePrice ?? 0,
      componentCostDollars,
      componentCount: active.length,
      frameWeightLbs: bike.weight,
      componentWeightGrams,
      componentBrandSpend: localBrandSpend,
    }
  })

  return {
    bikeCount: bikes.length,
    totalInvestmentDollars: bikeBreakdown.reduce(
      (sum, b) => sum + b.purchasePriceDollars + b.componentCostDollars,
      0,
    ),
    totalComponents: bikeBreakdown.reduce((sum, b) => sum + b.componentCount, 0),
    bikeBreakdown,
    categorySpending,
    brandCounts,
    componentBrandSpend,
  }
}

// ── 10. getBikesForCompare ─────────────────────────────────────

export async function getBikesForCompare(
  bikeIds: string[],
  userId: string,
): Promise<BikeCompareData[]> {
  const bikes = await db.userBike.findMany({
    where: { id: { in: bikeIds }, userId },
    include: { components: { where: { isActive: true } } },
  })

  return bikeIds
    .map(id => bikes.find(b => b.id === id))
    .filter((b): b is NonNullable<typeof b> => b !== undefined)
    .map(bike => {
      const componentCostDollars = bike.components.reduce(
        (sum, c) => sum + (c.priceCents ?? 0),
        0,
      ) / 100
      return {
        id: bike.id,
        brand: bike.brand,
        name: bike.name,
        year: bike.year,
        category: bike.category as string,
        wheelSize: bike.wheelSize,
        frameSize: bike.frameSize,
        frameMaterial: bike.frameMaterial,
        travel: bike.travel,
        frameWeightLbs: bike.weight,
        componentCount: bike.components.length,
        componentCostDollars,
        totalInvestmentDollars: (bike.purchasePrice ?? 0) + componentCostDollars,
        purchaseYear: bike.purchaseYear,
        purchasePriceDollars: bike.purchasePrice,
        imageUrl: bike.imageUrl,
      }
    })
}
