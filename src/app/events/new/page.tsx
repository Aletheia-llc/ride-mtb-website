import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { CreateEventForm } from './CreateEventForm'

export const metadata: Metadata = {
  title: 'Create Event | Ride MTB',
  description: 'Create a new mountain biking event and invite the community.',
}

export default async function NewEventPage() {
  await requireAuth()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/events"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">Create Event</h1>
      <p className="mb-8 text-[var(--color-text-muted)]">
        Rally the community around a ride, race, or trail day.
      </p>

      <CreateEventForm />
    </div>
  )
}
