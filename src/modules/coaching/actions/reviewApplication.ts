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

  const application = await db.coachApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true, title: true, bio: true, specialties: true, certifications: true, hourlyRate: true, location: true, calcomLink: true },
  })

  if (!application) return

  if (action === 'approve') {
    await db.$transaction([
      db.coachApplication.update({
        where: { id: applicationId },
        data: { status: 'approved', reviewNote, reviewedBy: admin.id, reviewedAt: new Date() },
      }),
      db.coachProfile.upsert({
        where: { userId: application.userId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        update: { title: application.title, bio: application.bio, specialties: application.specialties as any, certifications: application.certifications as any, hourlyRate: application.hourlyRate, location: application.location, calcomLink: application.calcomLink, isActive: true },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: { userId: application.userId, title: application.title, bio: application.bio, specialties: application.specialties as any, certifications: application.certifications as any, hourlyRate: application.hourlyRate, location: application.location, calcomLink: application.calcomLink },
      }),
    ])
  } else {
    await db.coachApplication.update({
      where: { id: applicationId },
      data: { status: 'rejected', reviewNote, reviewedBy: admin.id, reviewedAt: new Date() },
    })
  }

  revalidatePath('/admin/coaching')
}
