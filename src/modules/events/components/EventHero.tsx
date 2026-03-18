import type { EventDetailData } from '../types'
import { EventTypeBadge } from './EventTypeBadge'

interface DifficultyBadgeProps {
  difficulty: string
}

function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span className="inline-block rounded px-2 py-0.5 text-xs font-medium capitalize bg-gray-800/70 text-white">
      {difficulty}
    </span>
  )
}

type EventHeroProps = {
  event: Pick<EventDetailData, 'title' | 'coverImageUrl' | 'imageUrl' | 'eventType' | 'difficulty' | 'status'>
}

const TYPE_GRADIENT: Record<string, string> = {
  race: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  race_xc: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  race_enduro: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  race_dh: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  race_marathon: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  race_other: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  group_ride: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  clinic: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
  camp: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
  skills_clinic: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
  trail_work: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  social: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
  expo: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
  demo_day: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
  bike_park_day: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  virtual_challenge: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
}

const STATUS_BANNER: Record<string, { label: string; className: string }> = {
  cancelled: { label: 'This event has been cancelled', className: 'bg-red-600' },
  postponed: { label: 'This event has been postponed', className: 'bg-yellow-500' },
}

export function EventHero({ event }: EventHeroProps) {
  const heroImageUrl = event.coverImageUrl ?? event.imageUrl
  const gradient = TYPE_GRADIENT[event.eventType] ?? 'linear-gradient(135deg, #1f2937 0%, #374151 100%)'
  const statusBanner = STATUS_BANNER[event.status]

  return (
    <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
      {heroImageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImageUrl}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Dark gradient overlay for readability */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }}
          />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: gradient }} />
      )}

      {/* Status banner */}
      {statusBanner && (
        <div className={`absolute top-0 left-0 right-0 py-2 text-center text-sm font-semibold text-white ${statusBanner.className}`}>
          {statusBanner.label}
        </div>
      )}

      {/* Title + badges overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <EventTypeBadge eventType={event.eventType} />
          {event.difficulty && <DifficultyBadge difficulty={event.difficulty} />}
        </div>
        <h1 className="text-2xl font-bold text-white drop-shadow sm:text-4xl">
          {event.title}
        </h1>
      </div>
    </div>
  )
}
