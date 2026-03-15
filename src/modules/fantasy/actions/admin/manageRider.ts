'use server'

import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import type { Discipline, Gender } from '@/generated/prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (session?.user?.role !== 'admin') throw new Error('Unauthorized')
}

export async function createRider(data: {
  name: string
  nationality: string
  gender: Gender
  disciplines: Discipline[]
  uciId?: string
  photoUrl?: string
}) {
  await requireAdmin()
  const rider = await db.rider.create({ data })
  revalidatePath('/admin/fantasy/riders')
  return rider
}

export async function updateRider(id: string, data: Partial<{
  name: string
  nationality: string
  gender: Gender
  disciplines: Discipline[]
  uciId: string
  photoUrl: string
}>) {
  await requireAdmin()
  const rider = await db.rider.update({ where: { id }, data })
  revalidatePath('/admin/fantasy/riders')
  revalidatePath(`/admin/fantasy/riders/${id}`)
  return rider
}

export async function deleteRider(id: string) {
  await requireAdmin()
  await db.rider.delete({ where: { id } })
  revalidatePath('/admin/fantasy/riders')
}
