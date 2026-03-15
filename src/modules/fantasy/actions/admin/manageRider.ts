'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'

const createRiderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nationality: z.string().min(2, 'Nationality is required').max(3),
  gender: z.enum(['male', 'female']),
  disciplines: z.array(z.enum(['dh', 'ews', 'xc'])).min(1, 'At least one discipline is required'),
  uciId: z.string().optional(),
  photoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

const updateRiderSchema = z.object({
  id: z.string().min(1, 'Rider ID is required'),
  name: z.string().min(1, 'Name is required').optional(),
  nationality: z.string().min(2).max(3).optional(),
  gender: z.enum(['male', 'female']).optional(),
  disciplines: z.array(z.enum(['dh', 'ews', 'xc'])).min(1, 'At least one discipline is required').optional(),
  uciId: z.string().optional(),
  photoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

export type CreateRiderState = {
  errors: Record<string, string>
  success?: boolean
  riderId?: string
}

export type UpdateRiderState = {
  errors: Record<string, string>
  success?: boolean
}

export async function createRider(
  _prevState: CreateRiderState,
  formData: FormData,
): Promise<CreateRiderState> {
  try {
    await requireAdmin()

    const raw = {
      name: formData.get('name') as string,
      nationality: formData.get('nationality') as string,
      gender: formData.get('gender') as string,
      disciplines: formData.getAll('disciplines') as string[],
      uciId: (formData.get('uciId') as string) || undefined,
      photoUrl: (formData.get('photoUrl') as string) || undefined,
    }

    const parsed = createRiderSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      return { errors: fieldErrors }
    }

    const { name, nationality, gender, disciplines, uciId, photoUrl } = parsed.data

    const rider = await db.rider.create({
      data: {
        name,
        nationality,
        gender,
        disciplines,
        uciId: uciId || undefined,
        photoUrl: photoUrl || undefined,
      },
    })

    revalidatePath('/admin/fantasy/riders')

    return { errors: {}, success: true, riderId: rider.id }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Failed to create rider. Please try again.' } }
  }
}

export async function updateRider(
  _prevState: UpdateRiderState,
  formData: FormData,
): Promise<UpdateRiderState> {
  try {
    await requireAdmin()

    const disciplinesRaw = formData.getAll('disciplines') as string[]

    const raw = {
      id: formData.get('id') as string,
      name: (formData.get('name') as string) || undefined,
      nationality: (formData.get('nationality') as string) || undefined,
      gender: (formData.get('gender') as string) || undefined,
      disciplines: disciplinesRaw.length > 0 ? disciplinesRaw : undefined,
      uciId: (formData.get('uciId') as string) || undefined,
      photoUrl: (formData.get('photoUrl') as string) || undefined,
    }

    const parsed = updateRiderSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      return { errors: fieldErrors }
    }

    const { id, name, nationality, gender, disciplines, uciId, photoUrl } = parsed.data

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (nationality !== undefined) updateData.nationality = nationality
    if (gender !== undefined) updateData.gender = gender
    if (disciplines !== undefined) updateData.disciplines = disciplines
    if (uciId !== undefined) updateData.uciId = uciId
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null

    await db.rider.update({ where: { id }, data: updateData })

    revalidatePath('/admin/fantasy/riders')
    revalidatePath(`/admin/fantasy/riders/${id}`)

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Failed to update rider. Please try again.' } }
  }
}

export async function deleteRider(id: string): Promise<void> {
  try {
    await requireAdmin()
    await db.rider.delete({ where: { id } })
    revalidatePath('/admin/fantasy/riders')
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    throw new Error('Failed to delete rider. Please try again.')
  }
}
