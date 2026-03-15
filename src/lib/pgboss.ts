import 'server-only'
import { PgBoss } from 'pg-boss'
import { pool } from './db/client'

const globalForBoss = globalThis as unknown as { boss: PgBoss | undefined }

export async function getBoss(): Promise<PgBoss> {
  if (!globalForBoss.boss) {
    // pg-boss v10 requires a `db` adapter object with `executeSql`, not a raw pg.Pool
    const boss = new PgBoss({
      db: {
        executeSql: async (text: string, values?: unknown[]) =>
          pool.query(text, values as unknown[]),
      },
    })
    await boss.start()
    // Store unconditionally — both dev and production must reuse the singleton
    // to avoid creating a new pg-boss instance on every serverless invocation
    globalForBoss.boss = boss
    return boss
  }
  return globalForBoss.boss
}

export type JobName =
  | 'video.ingest'
  | 'video.transcode'
  | 'video.tag'
  | 'fantasy.prices.recalculate'
  | 'fantasy.prices.reveal'
  | 'fantasy.results.scrape'
  | 'fantasy.results.score'
  | 'fantasy.mulligan.auto-pick'

export interface VideoIngestPayload {
  youtubeVideoId: string
  creatorId: string
  source: 'manual' | 'rss' | 'backcatalog'
}
