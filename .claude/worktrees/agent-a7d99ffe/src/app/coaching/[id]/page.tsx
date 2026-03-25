import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CoachDetailView } from '@/modules/coaching'
// eslint-disable-next-line no-restricted-imports
import { getCoachById } from '@/modules/coaching/lib/queries'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const coach = await getCoachById(id)

  if (!coach) {
    return { title: 'Coach Not Found | Ride MTB' }
  }

  return {
    title: `${coach.userName ?? 'Coach'} - ${coach.title} | Ride MTB`,
    description:
      coach.bio.length > 160
        ? `${coach.bio.slice(0, 157)}...`
        : coach.bio,
  }
}

export default async function CoachDetailPage({ params }: Props) {
  const { id } = await params
  const coach = await getCoachById(id)

  if (!coach) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/coaching"
          className="transition-colors hover:text-[var(--color-text)]"
        >
          Coaches
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">
          {coach.userName ?? 'Coach'}
        </span>
      </nav>

      <CoachDetailView coach={coach} />
    </div>
  )
}
