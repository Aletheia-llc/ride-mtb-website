// src/ui/components/fantasy/ExpertPicksPanel.tsx
import { db } from '@/lib/db/client'
import { auth } from '@/lib/auth'
import { hasSeasonPass } from '@/modules/fantasy/queries/getSeasonPass'

interface Props {
  eventId: string
  seriesId: string
  season: number
  rosterDeadline: Date
}

export async function ExpertPicksPanel({
  eventId,
  seriesId,
  season,
  rosterDeadline,
}: Props) {
  // First check how many picks are published (no names — just the count)
  const publishedCount = await db.expertPick.count({
    where: { eventId, publishedAt: { not: null } },
  })

  if (publishedCount === 0) {
    return (
      <div className="border border-[var(--color-border)] rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-1">Expert Picks</h3>
        <p className="text-xs text-[var(--color-text-muted)]">Expert picks coming soon.</p>
      </div>
    )
  }

  const isAfterDeadline = new Date() >= rosterDeadline

  const session = await auth()
  const userId = session?.user?.id ?? null
  const userHasPass = userId
    ? await hasSeasonPass(userId, seriesId, season)
    : false

  // After deadline: everyone can see. Before deadline: pass holders only.
  const canViewPicks = isAfterDeadline || userHasPass

  if (!canViewPicks) {
    // Upsell — do NOT fetch actual names; show count placeholder only
    return (
      <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm">Expert Picks</h3>
        <div className="relative">
          {/* Placeholder rows — no real names */}
          <div className="space-y-1.5 select-none pointer-events-none" aria-hidden>
            {Array.from({ length: publishedCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-xs font-bold text-[var(--color-text-muted)]">
                  {i + 1}
                </span>
                <span className="h-4 w-28 bg-[var(--color-bg-secondary)] rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--color-bg)]/80 rounded">
            <p className="text-sm font-semibold">Unlock Expert Picks</p>
            <p className="text-xs text-[var(--color-text-muted)] text-center px-4">
              Season pass holders see expert picks before roster lock.
            </p>
            <a
              href={`/fantasy/${seriesId}/pass`}
              className="mt-1 bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Get Season Pass — $29.99
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Fetch full picks only for users who can view them
  const expertPicks = await db.expertPick.findMany({
    where: { eventId, publishedAt: { not: null } },
    orderBy: { slot: 'asc' },
    include: {
      rider: { select: { id: true, name: true, nationality: true } },
    },
  })

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Expert Picks</h3>
        {!isAfterDeadline && userHasPass && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            Season Pass
          </span>
        )}
        {isAfterDeadline && (
          <span className="text-xs text-[var(--color-text-muted)]">Roster locked</span>
        )}
      </div>
      <ol className="space-y-1.5">
        {expertPicks.map((pick: (typeof expertPicks)[number]) => (
          <li key={pick.id} className="flex items-center gap-3 text-sm">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-xs font-bold text-[var(--color-text-muted)]">
              {pick.slot}
            </span>
            <span className="font-medium">{pick.rider.name}</span>
            <span className="text-[var(--color-text-muted)] text-xs">{pick.rider.nationality}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
