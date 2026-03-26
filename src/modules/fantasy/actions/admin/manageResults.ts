'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { db } from '@/lib/db/client'
import { handleResultsScore } from '@/modules/fantasy/worker/resultsScore'

const upsertResultSchema = z.object({
  eventId: z.string().min(1),
  riderId: z.string().min(1),
  finishPosition: z.coerce.number().int().positive().nullable(),
  qualifyingPosition: z.coerce.number().int().positive().nullable(),
  dnsDnf: z.boolean(),
  partialCompletion: z.boolean(),
})

export type UpsertResultState = {
  errors: Record<string, string>
  success?: boolean
}

export async function upsertRaceResult(
  _prevState: UpsertResultState,
  formData: FormData,
): Promise<UpsertResultState> {
  try {
    const user = await requireAdmin()

    const raw = {
      eventId: formData.get('eventId') as string,
      riderId: formData.get('riderId') as string,
      finishPosition: formData.get('finishPosition') ? Number(formData.get('finishPosition')) : null,
      qualifyingPosition: formData.get('qualifyingPosition') ? Number(formData.get('qualifyingPosition')) : null,
      dnsDnf: formData.get('dnsDnf') === 'true',
      partialCompletion: formData.get('partialCompletion') === 'true',
    }

    const parsed = upsertResultSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') fieldErrors[field] = issue.message
      }
      return { errors: fieldErrors }
    }

    const { eventId, riderId, finishPosition, qualifyingPosition, dnsDnf, partialCompletion } = parsed.data

    await db.raceResult.upsert({
      where: { eventId_riderId: { eventId, riderId } },
      create: {
        eventId,
        riderId,
        finishPosition,
        qualifyingPosition,
        dnsDnf,
        partialCompletion,
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedByUserId: user.id,
      },
      update: {
        finishPosition,
        qualifyingPosition,
        dnsDnf,
        partialCompletion,
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedByUserId: user.id,
      },
    })

    revalidatePath(`/admin/fantasy/events/${eventId}/results`)
    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
    return { errors: { general: 'Failed to save result.' } }
  }
}

export async function runScoring(eventId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    await handleResultsScore({ eventId })
    revalidatePath(`/admin/fantasy/events/${eventId}`)
    revalidatePath(`/admin/fantasy/events/${eventId}/results`)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Scoring failed' }
  }
}
