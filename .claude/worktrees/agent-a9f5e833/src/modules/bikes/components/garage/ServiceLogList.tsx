import { Card } from '@/ui/components'
import type { BikeServiceLogData } from '../../types/garage'
import { DeleteServiceLogButton } from './DeleteServiceLogButton'

interface ServiceLogListProps {
  logs: BikeServiceLogData[]
  bikeId: string
}

export function ServiceLogList({ logs, bikeId }: ServiceLogListProps) {
  if (logs.length === 0) {
    return (
      <p className="py-4 text-sm text-[var(--color-text-muted)]">
        No service entries yet. Keep track of maintenance, upgrades, and repairs.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <Card key={log.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-[var(--color-text)]">
                  {log.serviceType}
                </h4>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(log.serviceDate).toLocaleDateString()}
                </span>
              </div>
              {log.description && (
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {log.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                {log.cost != null && (
                  <span>${log.cost.toFixed(2)}</span>
                )}
                {log.mileage != null && (
                  <span>{log.mileage} mi</span>
                )}
              </div>
            </div>
            <DeleteServiceLogButton logId={log.id} bikeId={bikeId} />
          </div>
        </Card>
      ))}
    </div>
  )
}
