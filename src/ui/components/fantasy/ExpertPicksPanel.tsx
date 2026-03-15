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
  const session = await auth()
  const userId = session?.user?.id ?? null

  const expertPicks = await db.expertPick.findMany({
    where: { eventId, publishedAt: { not: null } },
    orderBy: { slot: 'asc' },
    include: {
      rider: { select: { id: true, name: true, nationality: true } },
    },
  })

  if (expertPicks.length === 0) {
    return (
      <div className="border border-[var(--color-border)] rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-1">Expert Picks</h3>
        <p className="text-xs text-[var(--color-text-muted)]">Expert picks coming soon.</p>
      </div>
    )
  }

  const isAfterDeadline = new Date() >= rosterDeadline
  const userHasPass = userId
    ? await hasSeasonPass(userId, seriesId, season)
    : false

  // After deadline: everyone can see. Before deadline: pass holders only.
  const canViewPicks = isAfterDeadline || userHasPass

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

      {canViewPicks ? (
        <ol className="space-y-1.5">
          {expertPicks.map((pick: (typeof expertPicks)[number]) => (
            <li
              key={pick.id}
              className="flex items-center gap-3 text-sm"
            >
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-xs font-bold text-[var(--color-text-muted)]">
                {pick.slot}
              </span>
              <span className="font-medium">{pick.rider.name}</span>
              <span className="text-[var(--color-text-muted)] text-xs">{pick.rider.nationality}</span>
            </li>
          ))}
        </ol>
      ) : (
        // Blurred upsell — show blurred rows with a CTA overlay
        <div className="relative">
          <ol className="space-y-1.5 blur-sm select-none pointer-events-none" aria-hidden>
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
      )}
    </div>
  )
}
