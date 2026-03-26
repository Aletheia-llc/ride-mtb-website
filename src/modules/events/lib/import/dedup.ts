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
  if (events.length === 0) return { inserted: 0, skipped: 0 }

  // Single query to find all existing (importSource, externalId) pairs in this batch
  const importSources = events.map((e) => e.importSource)
  const externalIds = events.map((e) => e.externalId)

  const existingResult = await pool.query<{ importSource: string; externalId: string }>(
    `SELECT "importSource", "externalId"
     FROM events
     WHERE ("importSource", "externalId") IN (
       SELECT unnest($1::text[]), unnest($2::text[])
     )`,
    [importSources, externalIds],
  )

  const existingKeys = new Set(
    existingResult.rows.map((r) => `${r.importSource}::${r.externalId}`),
  )

  const newEvents = events.filter((e) => !existingKeys.has(`${e.importSource}::${e.externalId}`))

  if (newEvents.length === 0) {
    return { inserted: 0, skipped: events.length }
  }

  // Batch insert all new events in a single query
  const valueClauses: string[] = []
  const params: unknown[] = []
  let p = 1

  for (const event of newEvents) {
    valueClauses.push(
      `(gen_random_uuid(), $${p++}, $${p++}, $${p++}, $${p++}, 'published', $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, NOW(), NOW())`,
    )
    params.push(
      event.title,
      event.slug,
      event.startDate,
      event.eventType,
      event.importSource,
      event.externalId,
      event.location ?? null,
      event.city ?? null,
      event.state ?? null,
      event.registrationUrl ?? null,
      event.isFree ?? false,
    )
  }

  await pool.query(
    `INSERT INTO events (id, title, slug, "startDate", "eventType", status, "importSource", "externalId",
      location, city, state, "registrationUrl", "isFree", "createdAt", "updatedAt")
     VALUES ${valueClauses.join(', ')}`,
    params,
  )

  return { inserted: newEvents.length, skipped: events.length - newEvents.length }
}
