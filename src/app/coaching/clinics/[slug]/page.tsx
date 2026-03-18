import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { getClinicBySlug } from '@/modules/coaching/lib/queries'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const clinic = await getClinicBySlug(slug)
  if (!clinic) return { title: 'Clinic Not Found | Ride MTB' }

  return {
    title: `${clinic.title} | Ride MTB`,
    description: clinic.description ?? `Coaching clinic with ${clinic.coachName ?? 'a certified coach'} in ${clinic.location}.`,
  }
}

export default async function ClinicDetailPage({ params }: Props) {
  const { slug } = await params
  const clinic = await getClinicBySlug(slug)

  if (!clinic) notFound()

  const dateStr = clinic.startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const endDateStr = clinic.endDate
    ? clinic.endDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const costDisplay = clinic.isFree
    ? 'Free'
    : clinic.costCents
      ? '$' + (clinic.costCents / 100).toFixed(2)
      : 'Contact for pricing'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        {clinic.title}
      </h1>

      {clinic.coachName && (
        <p className="mb-6 text-base text-[var(--color-text-muted)]">
          with{' '}
          <a
            href={`/coaching/${clinic.coachId}`}
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            {clinic.coachName}
          </a>
          {' · '}
          {clinic.coachTitle}
        </p>
      )}

      <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 space-y-3">
        <div className="flex items-start gap-3 text-sm">
          <span className="w-20 shrink-0 font-medium text-[var(--color-text)]">Date</span>
          <span className="text-[var(--color-text-muted)]">
            {dateStr}
            {endDateStr && ` – ${endDateStr}`}
          </span>
        </div>

        <div className="flex items-start gap-3 text-sm">
          <span className="w-20 shrink-0 font-medium text-[var(--color-text)]">Location</span>
          <span className="text-[var(--color-text-muted)]">{clinic.location}</span>
        </div>

        <div className="flex items-start gap-3 text-sm">
          <span className="w-20 shrink-0 font-medium text-[var(--color-text)]">Cost</span>
          <span className="font-semibold text-[var(--color-primary)]">{costDisplay}</span>
        </div>

        {clinic.capacity && (
          <div className="flex items-start gap-3 text-sm">
            <span className="w-20 shrink-0 font-medium text-[var(--color-text)]">Capacity</span>
            <span className="text-[var(--color-text-muted)]">{clinic.capacity} riders</span>
          </div>
        )}
      </div>

      {clinic.description && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">About This Clinic</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text-muted)]">
            {clinic.description}
          </p>
        </div>
      )}

      {clinic.coachSpecialties.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {clinic.coachSpecialties.map((s) => (
              <span
                key={s}
                className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        {clinic.calcomLink ? (
          <a
            href={clinic.calcomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            Book This Clinic
          </a>
        ) : (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <p className="text-sm text-[var(--color-text-muted)]">
              To book this clinic, contact the coach directly via their{' '}
              <a href={`/coaching/${clinic.coachId}`} className="text-[var(--color-primary)] hover:underline">
                profile page
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
