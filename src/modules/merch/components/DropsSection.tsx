import { auth } from '@/lib/auth/config'
import { getActiveDrops, getUpcomingDrops, isSubscribedToDrops } from '@/modules/merch/actions/drops'
import { DropCard } from './DropCard'
import { DropSubscribeButton } from './DropSubscribeButton'

export async function DropsSection() {
  const [activeDrops, upcomingDrops, session] = await Promise.all([
    getActiveDrops(),
    getUpcomingDrops(),
    auth(),
  ])

  const isSubscribed = session?.user?.id ? await isSubscribedToDrops() : false

  const hasDrops = activeDrops.length > 0 || upcomingDrops.length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Limited Drops</h1>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Exclusive limited-edition releases. Get notified before they sell out.
          </p>
        </div>
        {session?.user && (
          <DropSubscribeButton isSubscribed={isSubscribed} />
        )}
      </div>

      {activeDrops.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">Active Now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeDrops.map((drop) => (
              <DropCard key={drop.id} drop={drop} />
            ))}
          </div>
        </section>
      )}

      {upcomingDrops.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">Coming Soon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingDrops.map((drop) => (
              <DropCard key={drop.id} drop={drop} upcoming />
            ))}
          </div>
        </section>
      )}

      {!hasDrops && (
        <div className="text-center py-16">
          <p className="text-[var(--color-text-muted)] text-lg">No drops right now.</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            Subscribe to get notified when the next drop goes live.
          </p>
        </div>
      )}
    </div>
  )
}
