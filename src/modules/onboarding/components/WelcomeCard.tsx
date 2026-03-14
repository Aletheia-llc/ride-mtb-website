'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/modules/onboarding/actions/completeOnboarding'

interface Course {
  id: string
  title: string
  slug: string
}

interface Community {
  id: string
  name: string
  slug: string
}

interface Trail {
  id: string
  name: string
  slug: string
}

interface Recommendations {
  course: Course | null
  community: Community | null
  trail: Trail | null
}

export default function WelcomeCard() {
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    completeOnboarding()
      .then(setRecommendations)
      .catch(() => setRecommendations({ course: null, community: null, trail: null }))
      .finally(() => setLoading(false))
  }, [])

  const hasAny =
    recommendations?.course || recommendations?.community || recommendations?.trail

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-12 text-center">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          You&apos;re all set!
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Here&apos;s what we recommend to get you started.
        </p>
      </div>

      {loading ? (
        <div className="mb-10 py-8" style={{ color: 'var(--color-dim)' }}>
          Loading your recommendations&hellip;
        </div>
      ) : hasAny ? (
        <div className="space-y-3 mb-10 text-left">
          {recommendations?.course && (
            <RecommendationCard
              label="Start learning"
              title={recommendations.course.title}
              href={`/learn/courses/${recommendations.course.slug}`}
            />
          )}
          {recommendations?.community && (
            <RecommendationCard
              label="Join the conversation"
              title={recommendations.community.name}
              href="/forum"
            />
          )}
          {recommendations?.trail && (
            <RecommendationCard
              label="Find trails near you"
              title={recommendations.trail.name}
              href="/trails"
            />
          )}
        </div>
      ) : (
        <div className="mb-10 py-8" style={{ color: 'var(--color-dim)' }}>
          Head to your dashboard to explore everything Ride MTB has to offer.
        </div>
      )}

      <button
        onClick={() => router.push('/dashboard')}
        className="px-8 py-3 rounded-lg font-semibold transition-opacity hover:opacity-90"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: '#ffffff',
        }}
      >
        Go to dashboard
      </button>
    </div>
  )
}

function RecommendationCard({
  label,
  title,
  href,
}: {
  label: string
  title: string
  href: string
}) {
  return (
    <a
      href={href}
      className="block rounded-lg p-4 transition-colors"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface-raised)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
      }}
    >
      <div
        className="text-xs uppercase tracking-wide mb-1"
        style={{ color: 'var(--color-dim)' }}
      >
        {label}
      </div>
      <div className="font-semibold" style={{ color: 'var(--color-text)' }}>
        {title}
      </div>
    </a>
  )
}
