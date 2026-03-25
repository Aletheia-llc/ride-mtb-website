import { notFound } from 'next/navigation'
import { getFacilityBySlug } from '@/modules/parks/actions/facilities'
import { FacilityDetail } from '@/modules/parks/components/FacilityDetail'
import { ReviewForm } from '@/modules/parks/components/ReviewForm'
import { ReviewList } from '@/modules/parks/components/ReviewList'
import { getFacilityReviews } from '@/modules/parks/actions/reviews'
import { PhotoGallery } from '@/modules/parks/components/PhotoGallery'
import { PhotoUpload } from '@/modules/parks/components/PhotoUpload'
import { getFacilityPhotos } from '@/modules/parks/actions/photos'
import { auth } from '@/lib/auth/config'

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

  const [reviews, photos, session] = await Promise.all([
    getFacilityReviews(facility.id),
    getFacilityPhotos(facility.id),
    auth(),
  ])

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
      <section className="mt-8">
        <PhotoGallery photos={photos} />
        {session && (
          <div className="mt-4">
            <PhotoUpload facilityId={facility.id} />
          </div>
        )}
      </section>
      <section className="mt-10">
        <h2 className="mb-6 text-xl font-bold text-[var(--color-text)]">Reviews</h2>
        {session ? (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Write a Review</h3>
            <ReviewForm facilityId={facility.id} />
          </div>
        ) : (
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            <a href="/signin" className="text-[var(--color-primary)] hover:underline">Sign in</a> to write a review.
          </p>
        )}
        <ReviewList reviews={reviews} />
      </section>
    </div>
  )
}
