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
