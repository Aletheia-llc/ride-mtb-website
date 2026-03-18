'use server'

import { auth } from '@/lib/auth/config'
import { pool } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'

export async function submitEvent(data: {
  title: string
  slug: string
  description?: string
  startDate: Date
  eventType: string
  location?: string
  address?: string
  city?: string
  state?: string
  registrationUrl?: string
  isFree?: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  await pool.query(
    `INSERT INTO events (id, "creatorId", title, slug, description, "startDate", "eventType", status,
      location, address, city, state, "registrationUrl", "isFree", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'pending_review', $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
    [session.user.id, data.title, data.slug, data.description ?? null, data.startDate,
     data.eventType, data.location ?? null, data.address ?? null, data.city ?? null,
     data.state ?? null, data.registrationUrl ?? null, data.isFree ?? false]
  )

  revalidatePath('/admin/submissions')
}
