'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { updateMyEventPreferences } from '@/modules/events/actions/preferences'
// eslint-disable-next-line no-restricted-imports
import { LocationPicker } from './LocationPicker'
import type { EventType, UserEventPreferenceData } from '@/modules/events/types'

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  group_ride: 'Group Ride',
  race: 'Race',
  skills_clinic: 'Skills Clinic',
  trail_work: 'Trail Work',
  social: 'Social',
  demo_day: 'Demo Day',
  other: 'Other',
  race_xc: 'XC Race',
  race_enduro: 'Enduro Race',
  race_dh: 'Downhill Race',
  race_marathon: 'Marathon Race',
  race_other: 'Other Race',
  clinic: 'Clinic',
  camp: 'Camp',
  expo: 'Expo',
  bike_park_day: 'Bike Park Day',
  virtual_challenge: 'Virtual Challenge',
}

const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[]

interface EventPreferencesFormProps {
  initialPrefs: Partial<UserEventPreferenceData> | null
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={[
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}

export function EventPreferencesForm({ initialPrefs }: EventPreferencesFormProps) {
  const [followedTypes, setFollowedTypes] = useState<string[]>(initialPrefs?.followedTypes ?? [])
  const [searchRadius, setSearchRadius] = useState(initialPrefs?.searchRadius ?? 100)
  const [newEventAlerts, setNewEventAlerts] = useState(initialPrefs?.newEventAlerts ?? true)
  const [reminderDays, setReminderDays] = useState(initialPrefs?.reminderDays ?? 3)
  const [resultsAlerts, setResultsAlerts] = useState(initialPrefs?.resultsAlerts ?? true)
  const [homeLatitude, setHomeLatitude] = useState<number | null>(initialPrefs?.homeLatitude ?? null)
  const [homeLongitude, setHomeLongitude] = useState<number | null>(initialPrefs?.homeLongitude ?? null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const toggleType = (type: string) => {
    setFollowedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const handleSave = () => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateMyEventPreferences({
          searchRadius,
          followedTypes,
          newEventAlerts,
          reminderDays,
          resultsAlerts,
          homeLatitude,
          homeLongitude,
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch {
        setError('Failed to save preferences. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Event Types */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-1 text-base font-semibold text-[var(--color-text)]">Event Types</h2>
        <p className="mb-4 text-xs text-[var(--color-text-muted)]">
          Select the types of events you want to follow and receive alerts for.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALL_EVENT_TYPES.map(type => {
            const checked = followedTypes.includes(type)
            return (
              <label
                key={type}
                className={[
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  checked
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleType(type)}
                />
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-current">
                  {checked && <Check className="h-3 w-3" />}
                </span>
                {EVENT_TYPE_LABELS[type]}
              </label>
            )
          })}
        </div>
        {followedTypes.length === 0 && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            No types selected — you'll see all event types.
          </p>
        )}
      </section>

      {/* Search Radius */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-1 text-base font-semibold text-[var(--color-text)]">Search Radius</h2>
        <p className="mb-4 text-xs text-[var(--color-text-muted)]">
          How far from your home location to search for events.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={searchRadius}
            onChange={e => setSearchRadius(Number(e.target.value))}
            className="flex-1 accent-[var(--color-primary)]"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={10}
              max={500}
              step={10}
              value={searchRadius}
              onChange={e => setSearchRadius(Math.max(10, Math.min(500, Number(e.target.value))))}
              className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-center text-sm text-[var(--color-text)]"
            />
            <span className="text-sm text-[var(--color-text-muted)]">km</span>
          </div>
        </div>
      </section>

      {/* Home Location */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-1 text-base font-semibold text-[var(--color-text)]">Home Location</h2>
        <p className="mb-4 text-xs text-[var(--color-text-muted)]">
          Used for distance calculations and nearby event alerts.
        </p>
        {homeLatitude !== null && homeLongitude !== null && (
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">
            📍 Current: {homeLatitude.toFixed(4)}, {homeLongitude.toFixed(4)}
          </p>
        )}
        <LocationPicker
          onLocationChange={({ latitude, longitude }) => {
            if (latitude !== null && longitude !== null) {
              setHomeLatitude(latitude)
              setHomeLongitude(longitude)
            }
          }}
        />
      </section>

      {/* Notifications */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">Notifications</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">New Event Alerts</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Get notified when new events are posted near you
              </p>
            </div>
            <Toggle checked={newEventAlerts} onChange={() => setNewEventAlerts(v => !v)} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Results Alerts</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Get notified when race results are posted for events you attended
              </p>
            </div>
            <Toggle checked={resultsAlerts} onChange={() => setResultsAlerts(v => !v)} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Event Reminders</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                How many days before a saved event to send a reminder
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={30}
                value={reminderDays}
                onChange={e =>
                  setReminderDays(Math.max(1, Math.min(30, Number(e.target.value))))
                }
                className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-center text-sm text-[var(--color-text)]"
              />
              <span className="text-sm text-[var(--color-text-muted)]">days</span>
            </div>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save Preferences'}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-[var(--color-primary)]">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
