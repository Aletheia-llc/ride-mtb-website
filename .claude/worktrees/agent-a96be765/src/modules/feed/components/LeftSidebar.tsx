// src/modules/feed/components/LeftSidebar.tsx
import Link from 'next/link'
import type { TrendingItem } from '../lib/queries'

interface XpData {
  totalXp: number
  streakDays: number
  weeklyXp: number
  nextLevelXp: number
}

interface LeftSidebarProps {
  isLoggedIn: boolean
  xpData?: XpData
  interests?: string[]
  trendingItems: TrendingItem[]
}

export function LeftSidebar({ isLoggedIn, xpData, interests, trendingItems }: LeftSidebarProps) {
  return (
    <aside className="flex flex-col gap-4">
      {isLoggedIn && xpData ? (
        <XpWidget xpData={xpData} />
      ) : (
        <JoinCard />
      )}
      {isLoggedIn && interests && interests.length > 0 && (
        <InterestsList interests={interests} />
      )}
      <TrendingNow items={trendingItems} />
    </aside>
  )
}

function XpWidget({ xpData }: { xpData: XpData }) {
  const progress = Math.min((xpData.totalXp % xpData.nextLevelXp) / xpData.nextLevelXp, 1)
  return (
    <div
      className="rounded-lg p-4 text-white"
      style={{ background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-light))' }}
    >
      <p className="text-xs opacity-80 mb-1">This week</p>
      <p className="text-2xl font-bold">{xpData.weeklyXp} XP</p>
      <div className="mt-2 h-1.5 rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-xs opacity-70 mt-1">{xpData.streakDays} day streak 🔥</p>
    </div>
  )
}

function JoinCard() {
  return (
    <div className="rounded-lg p-4 border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <p className="font-semibold text-sm mb-1">Join Ride MTB</p>
      <p className="text-xs text-[var(--color-text-muted)] mb-3">Learn, ride, connect.</p>
      <Link
        href="/signin"
        className="block text-center py-2 rounded text-sm font-semibold text-white"
        style={{ background: 'var(--color-primary)' }}
      >
        Join Free
      </Link>
    </div>
  )
}

function InterestsList({ interests }: { interests: string[] }) {
  return (
    <div className="rounded-lg p-3 border border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Your Interests</p>
        <Link href="/profile" className="text-xs text-[var(--color-primary)]">+ Edit</Link>
      </div>
      <ul className="flex flex-col gap-1">
        {interests.map((interest) => (
          <li key={interest} className="text-sm flex items-center gap-1.5">
            <span className="text-[var(--color-primary)]">★</span> {interest}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TrendingNow({ items }: { items: TrendingItem[] }) {
  return (
    <div className="rounded-lg p-3 border border-[var(--color-border)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Trending Now</p>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">Nothing trending yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.url} className="text-sm font-medium hover:text-[var(--color-primary)] leading-snug block">
                {item.title}
              </Link>
              <p className="text-xs text-[var(--color-text-muted)]">{item.replyCount} replies · {item.category}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
