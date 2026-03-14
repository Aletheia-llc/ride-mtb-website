'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

// --- Zod Schemas ---

const createDropSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  productIds: z.array(z.string().min(1)).min(1, 'At least one product ID is required'),
  launchAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  notifySubscribers: z.boolean().optional().default(true),
})

const updateDropSchema = createDropSchema.partial()

// --- Admin CRUD ---

export async function adminCreateDrop(data: {
  name: string
  description?: string
  coverImageUrl?: string
  productIds: string[]
  launchAt: Date
  endsAt?: Date
  notifySubscribers?: boolean
}) {
  await requireAdmin()

  const validated = createDropSchema.parse(data)

  const drop = await db.limitedDrop.create({
    data: {
      name: validated.name,
      description: validated.description || null,
      coverImageUrl: validated.coverImageUrl || null,
      productIds: validated.productIds,
      launchAt: validated.launchAt,
      endsAt: validated.endsAt || null,
      notifySubscribers: validated.notifySubscribers ?? true,
    },
  })

  revalidatePath('/admin/merch/drops')
  revalidatePath('/merch/drops')
  return drop
}

export async function adminUpdateDrop(
  id: string,
  data: Partial<{
    name: string
    description?: string
    coverImageUrl?: string
    productIds: string[]
    launchAt: Date
    endsAt?: Date
    notifySubscribers?: boolean
  }>,
) {
  await requireAdmin()

  const validated = updateDropSchema.parse(data)

  const updateData: Record<string, unknown> = {}
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.description !== undefined) updateData.description = validated.description || null
  if (validated.coverImageUrl !== undefined) updateData.coverImageUrl = validated.coverImageUrl || null
  if (validated.productIds !== undefined) updateData.productIds = validated.productIds
  if (validated.launchAt !== undefined) updateData.launchAt = validated.launchAt
  if (validated.endsAt !== undefined) updateData.endsAt = validated.endsAt || null
  if (validated.notifySubscribers !== undefined) updateData.notifySubscribers = validated.notifySubscribers

  const drop = await db.limitedDrop.update({
    where: { id },
    data: updateData,
  })

  revalidatePath('/admin/merch/drops')
  revalidatePath('/merch/drops')
  revalidatePath(`/merch/drops/${id}`)
  return drop
}

export async function adminDeleteDrop(id: string) {
  await requireAdmin()
  await db.limitedDrop.delete({ where: { id } })
  revalidatePath('/admin/merch/drops')
  revalidatePath('/merch/drops')
}

export async function adminActivateDrop(id: string) {
  await requireAdmin()

  const drop = await db.limitedDrop.update({
    where: { id },
    data: { isActive: true },
  })

  revalidatePath('/admin/merch/drops')
  revalidatePath('/merch/drops')
  revalidatePath(`/merch/drops/${id}`)
  return drop
}

export async function adminDeactivateDrop(id: string) {
  await requireAdmin()

  const drop = await db.limitedDrop.update({
    where: { id },
    data: { isActive: false },
  })

  revalidatePath('/admin/merch/drops')
  revalidatePath('/merch/drops')
  revalidatePath(`/merch/drops/${id}`)
  return drop
}

// --- Public Queries ---

export async function getActiveDrops() {
  const now = new Date()
  return db.limitedDrop.findMany({
    where: {
      isActive: true,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { launchAt: 'desc' },
  })
}

export async function getUpcomingDrops() {
  const now = new Date()
  return db.limitedDrop.findMany({
    where: {
      isActive: false,
      launchAt: { gt: now },
    },
    orderBy: { launchAt: 'asc' },
  })
}

export async function getPastDrops() {
  const now = new Date()
  return db.limitedDrop.findMany({
    where: {
      isActive: false,
      launchAt: { lt: now },
    },
    orderBy: { launchAt: 'desc' },
  })
}

export async function getDrop(id: string) {
  return db.limitedDrop.findUnique({ where: { id } })
}

export async function getAllDrops() {
  return db.limitedDrop.findMany({
    orderBy: { launchAt: 'desc' },
  })
}

// --- Subscriptions ---

export async function subscribeToDrops() {
  const user = await requireAuth()

  await db.dropSubscriber.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  })

  revalidatePath('/merch/drops')
}

export async function unsubscribeFromDrops() {
  const user = await requireAuth()

  await db.dropSubscriber.deleteMany({
    where: { userId: user.id },
  })

  revalidatePath('/merch/drops')
}

export async function isSubscribedToDrops(): Promise<boolean> {
  const { auth } = await import('@/lib/auth/config')
  const session = await auth()
  if (!session?.user?.id) return false

  const sub = await db.dropSubscriber.findUnique({
    where: { userId: session.user.id },
  })

  return !!sub
}
