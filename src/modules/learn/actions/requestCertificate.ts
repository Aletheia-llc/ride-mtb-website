'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { checkCourseCompletion, createCertificate, getCourseByIdLight } from '../lib/queries'
import { createNotification } from '@/lib/notifications'
import type { Tier } from '@/generated/prisma/client'

// ── Input schema ──────────────────────────────────────────────

const requestCertificateSchema = z.object({
  courseId: z.string().cuid(),
})

// ── Result type ───────────────────────────────────────────────

export type RequestCertificateResult =
  | { success: true; certificateId: string; tier: string }
  | { success: false; error: string }

// ── Helpers ───────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = {
  gold: 3,
  silver: 2,
  bronze: 1,
  incomplete: 0,
}

function getWorstTier(tiers: Tier[]): Tier {
  let worst: Tier = 'gold'
  for (const t of tiers) {
    if (TIER_ORDER[t] < TIER_ORDER[worst]) {
      worst = t
    }
  }
  return worst
}

// ── Server action ─────────────────────────────────────────────

export async function requestCertificate(
  input: unknown,
): Promise<RequestCertificateResult> {
  try {
    const user = await requireAuth()

    const parsed = requestCertificateSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Invalid input' }
    }
    const { courseId } = parsed.data

    const completion = await checkCourseCompletion(user.id, courseId)
    if (!completion.completed) {
      return { success: false, error: 'Course not yet completed' }
    }

    // Determine cert tier: worst tier among all quiz bestTiers
    const passedTiers = completion.bestTiers.filter(
      (t): t is Exclude<Tier, 'incomplete'> => t !== 'incomplete',
    )
    const tier = getWorstTier(passedTiers)

    const [cert, course] = await Promise.all([
      createCertificate(user.id, courseId, tier),
      getCourseByIdLight(courseId),
    ])

    void createNotification(
      user.id,
      'course_completed',
      'Certificate Issued!',
      `Your ${tier} certificate for "${course?.title ?? 'a course'}" is ready`,
      course?.slug ? `/learn/certificates` : '/learn',
    )

    return { success: true, certificateId: cert.id, tier }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    throw error
  }
}
