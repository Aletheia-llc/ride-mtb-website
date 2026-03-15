import Image from 'next/image'
import type { ManufacturerCupEntry } from '@/modules/fantasy/queries/getManufacturerCupLeaderboard'

interface Props {
  entries: ManufacturerCupEntry[]
  currentUserId?: string
}

export function ManufacturerCupTable({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        No manufacturer picks locked in yet. Standings will appear after Round 1 locks.
      </p>
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)] uppercase">
          <th className="py-2 pr-4 w-10">#</th>
          <th className="py-2 pr-4">Player</th>
          <th className="py-2 pr-4">Manufacturer</th>
          <th className="py-2 pr-4 text-right">Season Pts</th>
          <th className="py-2 text-right">Rounds Scored</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(entry => {
          const isMe = entry.userId === currentUserId
          return (
            <tr
              key={entry.userId}
              className={`border-b border-[var(--color-border)] ${
                isMe
                  ? 'bg-[var(--color-primary-bg)] font-semibold'
                  : 'hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              <td className="py-2.5 pr-4 tabular-nums">
                <span className={entry.rank <= 3 ? 'font-bold' : ''}>{entry.rank}</span>
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  {entry.avatarUrl ? (
                    <Image
                      src={entry.avatarUrl}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)]" />
                  )}
                  <span>
                    {entry.username ?? 'Unknown'}
                    {isMe ? ' (you)' : ''}
                  </span>
                </div>
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  {entry.manufacturerLogoUrl && (
                    <Image
                      src={entry.manufacturerLogoUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="rounded"
                      unoptimized
                    />
                  )}
                  <span>{entry.manufacturerName}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">{entry.seasonTotal}</td>
              <td className="py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">
                {entry.eventsScored}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
