'use server'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'

export async function reviewApplicationAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()

  const applicationId = formData.get('id') as string
  const action = formData.get('action') as 'approve' | 'reject'
  const reviewNote = (formData.get('reviewNote') as string)?.trim() || undefined

  // @ts-expect-error — model added to schema, not yet pushed
  const application = await db.coachApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true, title: true, bio: true, specialties: true, certifications: true, hourlyRate: true, location: true, calcomLink: true },
  })

  if (!application) return

  if (action === 'approve') {
    await db.$transaction([
      // @ts-expect-error — model added to schema, not yet pushed
      db.coachApplication.update({
        where: { id: applicationId },
        data: { status: 'approved', reviewNote, reviewedBy: admin.id, reviewedAt: new Date() },
      }),
      db.coachProfile.upsert({
        where: { userId: application.userId },
        update: { title: application.title, bio: application.bio, specialties: application.specialties, certifications: application.certifications, hourlyRate: application.hourlyRate, location: application.location, calcomLink: application.calcomLink, isActive: true },
        create: { userId: application.userId, title: application.title, bio: application.bio, specialties: application.specialties, certifications: application.certifications, hourlyRate: application.hourlyRate, location: application.location, calcomLink: application.calcomLink },
      }),
    ])
  } else {
    // @ts-expect-error — model added to schema, not yet pushed
    await db.coachApplication.update({
      where: { id: applicationId },
      data: { status: 'rejected', reviewNote, reviewedBy: admin.id, reviewedAt: new Date() },
    })
  }

  revalidatePath('/admin/coaching')
}
