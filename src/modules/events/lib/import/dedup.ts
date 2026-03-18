import { pool } from '@/lib/db/client'

export interface ImportEvent {
  title: string
  slug: string
  startDate: Date
  eventType: string
  importSource: string
  externalId: string
  location?: string
  city?: string
  state?: string
  registrationUrl?: string
  isFree?: boolean
  description?: string
}

export async function dedupAndInsert(events: ImportEvent[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0

  for (const event of events) {
    const existing = await pool.query(
      `SELECT id FROM events WHERE "importSource" = $1 AND "externalId" = $2 LIMIT 1`,
      [event.importSource, event.externalId]
    )
    if (existing.rows.length > 0) {
      skipped++
      continue
    }

    await pool.query(
      `INSERT INTO events (id, title, slug, "startDate", "eventType", status, "importSource", "externalId",
        location, city, state, "registrationUrl", "isFree", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'published', $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [event.title, event.slug, event.startDate, event.eventType, event.importSource,
       event.externalId, event.location ?? null, event.city ?? null, event.state ?? null,
       event.registrationUrl ?? null, event.isFree ?? false]
    )
    inserted++
  }

  return { inserted, skipped }
}
