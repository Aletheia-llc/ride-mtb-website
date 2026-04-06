'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
      .then((recs) => {
        setRecommendations(recs)
        toast.success('Welcome to Ride MTB!', {
          description: 'You earned 20 XP for completing setup',
          duration: 5000,
        })
      })
      .catch(() => setRecommendations({ course: null, community: null, trail: null }))
      .finally(() => setLoading(false))
  }, [])

  const hasAny =
    recommendations?.course || recommendations?.community || recommendations?.trail

  return (
    <div className="w-full max-w-md mx-auto px-4 py-10 sm:py-16">
      {/* Dot indicators — all filled on complete */}
      <div className="flex items-center justify-center gap-1.5 mb-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="rounded-full"
            style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-primary)' }}
          />
        ))}
      </div>

      <div
        className="rounded-2xl border p-6 sm:p-8 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="mb-6">
          <p className="text-4xl mb-3">🤘</p>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Welcome to Ride MTB!
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
            +20 XP earned
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Here&apos;s what we recommend to get you started.
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-sm" style={{ color: 'var(--color-dim)' }}>
            Loading your recommendations&hellip;
          </div>
        ) : hasAny ? (
          <div className="space-y-2 mb-6 text-left">
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
          <div className="py-6 text-sm" style={{ color: 'var(--color-dim)' }}>
            Head to your dashboard to explore everything Ride MTB has to offer.
          </div>
        )}

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
          }}
        >
          Go to dashboard
        </button>
      </div>
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
