import { Card, EmptyState } from '@/ui/components'
import { Clock, MapPin, Calendar } from 'lucide-react'
import type { RideLogWithTrail } from '../types'
import { DeleteRideButton } from './DeleteRideButton'

interface RideLogListProps {
  logs: RideLogWithTrail[]
  totalCount: number
}

export function RideLogList({ logs, totalCount }: RideLogListProps) {
  if (logs.length === 0) {
    return (
      <EmptyState
        title="No rides logged yet"
        description="Log your first ride to start tracking your progress."
      />
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-text-muted)]">
        {totalCount} {totalCount === 1 ? 'ride' : 'rides'} logged
      </p>

      {logs.map((log) => (
        <Card key={log.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" />
                {new Date(log.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>

              {/* Trail info */}
              {log.trailName && (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {log.trailName}
                    {log.trailSystemName && (
                      <span className="ml-1 opacity-70">
                        ({log.trailSystemName})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Duration */}
              {log.duration != null && (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <Clock className="h-4 w-4" />
                  <span>
                    {log.duration >= 60
                      ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m`
                      : `${log.duration}m`}
                  </span>
                </div>
              )}

              {/* Notes */}
              {log.notes && (
                <p className="mt-2 text-sm text-[var(--color-text)]">
                  {log.notes}
                </p>
              )}
            </div>

            <DeleteRideButton rideId={log.id} />
          </div>
        </Card>
      ))}
    </div>
  )
}
