'use client'

import { useActionState } from 'react'
import { Button, Input } from '@/ui/components'
import { logService, type LogServiceState } from '../../actions/logService'

interface ServiceLogFormProps {
  bikeId: string
}

const serviceTypes = [
  'Suspension Service',
  'Brake Bleed',
  'Drivetrain',
  'Tire Change',
  'Wheel True',
  'Bearing Service',
  'Full Tune-Up',
  'Fork Service',
  'Shock Service',
  'Cable Replacement',
  'Upgrade',
  'Other',
]

export function ServiceLogForm({ bikeId }: ServiceLogFormProps) {
  const [state, action, isPending] = useActionState<LogServiceState, FormData>(
    logService,
    { errors: {} },
  )

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="bikeId" value={bikeId} />

      {state.errors.general && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.errors.general}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          Service entry added successfully!
        </div>
      )}

      {/* Service Type */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="serviceType"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Service Type <span className="text-red-500">*</span>
        </label>
        <select
          id="serviceType"
          name="serviceType"
          required
          defaultValue=""
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        >
          <option value="" disabled>
            Select a service type...
          </option>
          {serviceTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {state.errors.serviceType && (
          <p className="text-xs text-red-500">{state.errors.serviceType}</p>
        )}
      </div>

      {/* Service Date */}
      <Input
        label="Service Date"
        name="serviceDate"
        type="date"
        required
        defaultValue={new Date().toISOString().split('T')[0]}
        error={state.errors.serviceDate}
      />

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="service-description"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Description
        </label>
        <textarea
          id="service-description"
          name="description"
          rows={3}
          placeholder="Details about the service performed..."
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
        {state.errors.description && (
          <p className="text-xs text-red-500">{state.errors.description}</p>
        )}
      </div>

      {/* Cost & Mileage */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Cost ($)"
          name="cost"
          type="number"
          step="0.01"
          min={0}
          placeholder="0.00"
          error={state.errors.cost}
        />
        <Input
          label="Mileage (mi)"
          name="mileage"
          type="number"
          step="0.1"
          min={0}
          placeholder="Current mileage"
          error={state.errors.mileage}
        />
      </div>

      <Button type="submit" loading={isPending}>
        Add Service Entry
      </Button>
    </form>
  )
}
