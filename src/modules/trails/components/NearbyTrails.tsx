import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import { db } from '@/lib/db/client'

interface NearbyTrailsProps {
  userLocation: string | null
}

async function getTrailSystemsByState(state: string, limit: number = 5) {
  return db.trailSystem.findMany({
    where: {
      status: 'open',
      state: { contains: state, mode: 'insensitive' },
      trailCount: { gt: 0 },
    },
    orderBy: { trailCount: 'desc' },
    take: limit,
    select: {
      name: true,
      slug: true,
      city: true,
      state: true,
      trailCount: true,
      totalMiles: true,
      averageRating: true,
    },
  })
}

function extractState(location: string): string | null {
  const parts = location.split(',').map((p) => p.trim())
  return parts.length >= 2 ? parts[parts.length - 1] : parts[0]
}

export async function NearbyTrails({ userLocation }: NearbyTrailsProps) {
  if (!userLocation) return null

  const state = extractState(userLocation)
  if (!state) return null

  const systems = await getTrailSystemsByState(state)
  if (systems.length === 0) return null

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text)]">
          <MapPin className="h-4 w-4 text-[var(--color-primary)]" />
          Trails Near You
        </h3>
        <Link href="/trails/explore" className="text-xs text-[var(--color-primary)] hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {systems.map((s) => (
          <Link
            key={s.slug}
            href={`/trails/explore/${s.slug}`}
            className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-primary)]/30"
          >
            <p className="text-sm font-medium text-[var(--color-text)] truncate">{s.name}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              <span>{s.trailCount} trails</span>
              {s.totalMiles > 0 && <span>{s.totalMiles.toFixed(0)} mi</span>}
              {s.averageRating != null && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {Number(s.averageRating).toFixed(1)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
