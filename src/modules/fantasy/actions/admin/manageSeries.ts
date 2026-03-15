'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import type { Discipline, SeriesStatus } from '@/generated/prisma/client'

const createSeriesSchema = z.object({
  name: z.string().min(1, 'Series name is required'),
  discipline: z.enum(['dh', 'ews', 'xc']),
  season: z.number().int().min(2020).max(2100),
  salaryCap: z.number().int().positive().default(150_000_000),
  sensitivityFactor: z.number().positive().default(1.5),
})

const updateSeriesSchema = z.object({
  id: z.string().min(1, 'Series ID is required'),
  name: z.string().min(1, 'Series name is required').optional(),
  status: z.enum(['upcoming', 'active', 'completed'] as const).optional(),
  salaryCap: z.number().int().positive().optional(),
  sensitivityFactor: z.number().positive().optional(),
})

export type CreateSeriesState = {
  errors: Record<string, string>
  success?: boolean
  seriesId?: string
}

export type UpdateSeriesState = {
  errors: Record<string, string>
  success?: boolean
}

export async function createSeries(
  _prevState: CreateSeriesState,
  formData: FormData,
): Promise<CreateSeriesState> {
  try {
    await requireAdmin()

    const raw = {
      name: formData.get('name') as string,
      discipline: formData.get('discipline') as string,
      season: parseInt(formData.get('season') as string),
      salaryCap: formData.get('salaryCap')
        ? parseInt(formData.get('salaryCap') as string)
        : undefined,
      sensitivityFactor: formData.get('sensitivityFactor')
        ? parseFloat(formData.get('sensitivityFactor') as string)
        : undefined,
    }

    const parsed = createSeriesSchema.safeParse(raw)
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

    const { name, discipline, season, salaryCap, sensitivityFactor } = parsed.data

    // Check for duplicate discipline/season combo
    const existing = await db.fantasySeries.findUnique({
      where: { discipline_season: { discipline: discipline as Discipline, season } },
    })

    if (existing) {
      return {
        errors: {
          general: `A ${discipline.toUpperCase()} series for season ${season} already exists.`,
        },
      }
    }

    const series = await db.fantasySeries.create({
      data: {
        name,
        discipline: discipline as Discipline,
        season,
        salaryCap,
        sensitivityFactor,
        status: 'upcoming',
      },
    })

    revalidatePath('/admin/fantasy/series')

    return { errors: {}, success: true, seriesId: series.id }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Failed to create series. Please try again.' } }
  }
}

export async function updateSeries(
  _prevState: UpdateSeriesState,
  formData: FormData,
): Promise<UpdateSeriesState> {
  try {
    await requireAdmin()

    const raw = {
      id: formData.get('id') as string,
      name: formData.get('name') as string | undefined,
      status: formData.get('status') as string | undefined,
      salaryCap: formData.get('salaryCap')
        ? parseInt(formData.get('salaryCap') as string)
        : undefined,
      sensitivityFactor: formData.get('sensitivityFactor')
        ? parseFloat(formData.get('sensitivityFactor') as string)
        : undefined,
    }

    const parsed = updateSeriesSchema.safeParse(raw)
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

    const { id, name, status, salaryCap, sensitivityFactor } = parsed.data

    const updateData: { name?: string; status?: SeriesStatus; salaryCap?: number; sensitivityFactor?: number } = {}
    if (name !== undefined) updateData.name = name
    if (status !== undefined) updateData.status = status as SeriesStatus
    if (salaryCap !== undefined) updateData.salaryCap = salaryCap
    if (sensitivityFactor !== undefined) updateData.sensitivityFactor = sensitivityFactor

    await db.fantasySeries.update({
      where: { id },
      data: updateData,
    })

    revalidatePath('/admin/fantasy/series')
    revalidatePath(`/admin/fantasy/series/${id}`)

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Failed to update series. Please try again.' } }
  }
}
