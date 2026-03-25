import Link from 'next/link'
import { getStateStats } from '@/modules/parks/actions/facilities'

export const metadata = {
  title: 'Parks & Facilities | Ride MTB',
}

export default async function ParksPage() {
  const states = await getStateStats()

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        Skateparks, Pump Tracks &amp; Bike Parks
      </h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Browse {states.reduce((n, s) => n + s.count, 0).toLocaleString()} facilities across the US.
      </p>

      {states.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">
          No facilities synced yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {states.map((s) => (
            <Link
              key={s.stateSlug}
              href={`/parks/${s.stateSlug}`}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center hover:border-[var(--color-primary)] transition-colors"
            >
              <p className="font-semibold text-[var(--color-text)]">{s.stateName}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {s.count} {s.count === 1 ? 'facility' : 'facilities'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
