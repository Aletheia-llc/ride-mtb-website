import 'server-only'
import { db } from '@/lib/db/client'
import { paginate } from '@/lib/db/helpers'
import type { RideLogWithTrail } from '../types'

// ── getUserRideLogs ─────────────────────────────────────────

export async function getUserRideLogs(
  userId: string,
  page: number = 1,
): Promise<{ logs: RideLogWithTrail[]; totalCount: number }> {
  const where = { userId }

  const [rawLogs, totalCount] = await Promise.all([
    db.rideLog.findMany({
      where,
      ...paginate(page),
      orderBy: { date: 'desc' },
    }),
    db.rideLog.count({ where }),
  ])

  // RideLog doesn't have a relation to Trail in the schema,
  // so we look up trail names in a separate query.
  const trailIds = rawLogs
    .map((log) => log.trailId)
    .filter((id): id is string => id !== null)

  const trails =
    trailIds.length > 0
      ? await db.trail.findMany({
          where: { id: { in: trailIds } },
          select: {
            id: true,
            name: true,
            system: { select: { name: true } },
          },
        })
      : []

  const trailMap = new Map(
    trails.map((t) => [t.id, { name: t.name, systemName: t.system.name }]),
  )

  const logs: RideLogWithTrail[] = rawLogs.map((log) => {
    const trailInfo = log.trailId ? trailMap.get(log.trailId) : null
    return {
      id: log.id,
      date: log.date,
      duration: log.duration,
      notes: log.notes,
      trailId: log.trailId,
      createdAt: log.createdAt,
      trailName: trailInfo?.name ?? null,
      trailSystemName: trailInfo?.systemName ?? null,
    }
  })

  return { logs, totalCount }
}

// ── createRideLog ───────────────────────────────────────────

interface CreateRideLogInput {
  userId: string
  date: Date
  duration?: number
  notes?: string
  trailId?: string
}

export async function createRideLog(input: CreateRideLogInput) {
  return db.rideLog.create({
    data: {
      userId: input.userId,
      date: input.date,
      duration: input.duration ?? null,
      notes: input.notes ?? null,
      trailId: input.trailId ?? null,
    },
  })
}

// ── deleteRideLog ───────────────────────────────────────────

export async function deleteRideLog(
  id: string,
  userId: string,
): Promise<boolean> {
  const log = await db.rideLog.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!log || log.userId !== userId) {
    return false
  }

  await db.rideLog.delete({ where: { id } })
  return true
}
