'use server'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function removeComponent(componentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth()
    const component = await db.bikeComponent.findFirst({
      where: { id: componentId },
      include: { bike: { select: { userId: true } } },
    })
    if (!component || component.bike.userId !== user.id) return { success: false, error: 'Not found' }
    await db.bikeComponent.update({ where: { id: componentId }, data: { isActive: false, removedAt: new Date() } })
    revalidatePath(`/bikes/garage/${component.bikeId}`)
    return { success: true }
  } catch {
    return { success: false, error: 'Something went wrong' }
  }
}
