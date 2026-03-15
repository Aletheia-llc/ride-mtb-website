interface LeaderboardEntry {
  rank: number
  userId?: string
  name: string | null
  username: string | null
  avatarUrl: string | null
  totalPoints: number
  eventsPlayed: number
  bestEventScore: number | null
  isPrizeEligible?: boolean
}

export function LeaderboardTable({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
          <th className="pb-2 w-12">#</th>
          <th className="pb-2">Team</th>
          <th className="pb-2 text-right">Points</th>
          <th className="pb-2 text-right hidden md:table-cell">Best</th>
          <th className="pb-2 text-right hidden md:table-cell">Events</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(e => (
          <tr key={e.userId ?? e.rank}
            className={`border-b border-[var(--color-border)] ${(e.userId ?? e.username) === currentUserId ? 'bg-green-50 dark:bg-green-900/10' : ''}`}>
            <td className="py-2 pr-3 font-bold text-[var(--color-text-muted)]">{e.rank}</td>
            <td className="py-2">
              <div className="flex items-center gap-2">
                {e.avatarUrl
                  ? <img src={e.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                  : <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-xs font-bold">
                      {(e.name ?? e.username ?? '?')[0].toUpperCase()}
                    </div>
                }
                <span className="font-medium">{e.name ?? e.username}</span>
                {e.isPrizeEligible && <span title="Prize eligible">🏆</span>}
              </div>
            </td>
            <td className="py-2 text-right font-bold">{e.totalPoints}</td>
            <td className="py-2 text-right text-[var(--color-text-muted)] hidden md:table-cell">{e.bestEventScore ?? '—'}</td>
            <td className="py-2 text-right text-[var(--color-text-muted)] hidden md:table-cell">{e.eventsPlayed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
