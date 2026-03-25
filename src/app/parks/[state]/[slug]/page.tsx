import { notFound } from 'next/navigation'
import { getFacilityBySlug } from '@/modules/parks/actions/facilities'
import { FacilityDetail } from '@/modules/parks/components/FacilityDetail'

interface DetailPageProps {
  params: Promise<{ state: string; slug: string }>
}

export async function generateMetadata({ params }: DetailPageProps) {
  const { slug } = await params
  const facility = await getFacilityBySlug(slug)
  if (!facility) return {}
  return {
    title: `${facility.name} | Ride MTB Parks`,
  }
}

export default async function FacilityDetailPage({ params }: DetailPageProps) {
  const { state: stateSlug, slug } = await params
  const facility = await getFacilityBySlug(slug)

  if (!facility || facility.stateSlug !== stateSlug) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-6 text-sm text-[var(--color-text-muted)]">
        <a href="/parks" className="hover:text-[var(--color-text)]">Parks</a>
        <span className="mx-2">/</span>
        <a href={`/parks/${stateSlug}`} className="hover:text-[var(--color-text)]">{facility.state}</a>
        <span className="mx-2">/</span>
        <span>{facility.name}</span>
      </nav>
      <FacilityDetail facility={facility} />
      {/* Reviews and photos sections added in Tasks 8 & 9 */}
    </div>
  )
}
