import type { LimitedDrop } from '@/generated/prisma/client'

interface DropCardProps {
  drop: LimitedDrop
  upcoming?: boolean
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function DropCard({ drop, upcoming = false }: DropCardProps) {
  const productCount = drop.productIds.length

  return (
    <div
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
    >
      {drop.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={drop.coverImageUrl}
          alt={drop.name}
          className="w-full h-40 object-cover"
        />
      )}
      {!drop.coverImageUrl && (
        <div
          className="w-full h-40 flex items-center justify-center"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          <span className="text-4xl">🛍️</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {upcoming ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
              Coming Soon
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
              Live
            </span>
          )}
        </div>

        <h3 className="font-semibold text-[var(--color-text)] mb-1">{drop.name}</h3>

        {drop.description && (
          <p className="text-sm text-[var(--color-text-muted)] mb-3 line-clamp-2">
            {drop.description}
          </p>
        )}

        <div className="text-xs text-[var(--color-text-muted)] space-y-1">
          <p>
            <span className="font-medium">{upcoming ? 'Launches' : 'Launched'}:</span>{' '}
            {formatDate(drop.launchAt)}
          </p>
          {drop.endsAt && (
            <p>
              <span className="font-medium">Ends:</span> {formatDate(drop.endsAt)}
            </p>
          )}
          <p>
            <span className="font-medium">Products:</span> {productCount}
          </p>
        </div>
      </div>
    </div>
  )
}
