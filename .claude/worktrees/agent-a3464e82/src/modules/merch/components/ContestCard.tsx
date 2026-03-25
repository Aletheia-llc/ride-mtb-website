import Link from 'next/link'
import type { ContestStatus } from '@/generated/prisma/client'

interface ContestCardProps {
  contest: {
    id: string
    title: string
    description: string
    coverImageUrl: string | null
    productType: string
    submissionStart: Date
    submissionEnd: Date
    votingStart: Date
    votingEnd: Date
    status: ContestStatus
    prizeDescription: string | null
    submissions: { id: string }[]
  }
}

const STATUS_LABELS: Record<ContestStatus, string> = {
  accepting_submissions: 'Open for Submissions',
  voting: 'Voting Open',
  closed: 'Closed',
  winner_announced: 'Winner Announced',
  in_production: 'In Production',
  completed: 'Completed',
}

const STATUS_COLORS: Record<ContestStatus, string> = {
  accepting_submissions: 'bg-green-100 text-green-800',
  voting: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-700',
  winner_announced: 'bg-yellow-100 text-yellow-800',
  in_production: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-600',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function ContestCard({ contest }: ContestCardProps) {
  const submissionCount = contest.submissions.length

  return (
    <Link href={`/merch/contests/${contest.id}`} className="block group">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden hover:border-[var(--color-primary)] transition-colors">
        {contest.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contest.coverImageUrl}
            alt={contest.title}
            className="w-full h-40 object-cover"
          />
        )}
        {!contest.coverImageUrl && (
          <div
            className="w-full h-40 flex items-center justify-center"
            style={{ background: 'var(--color-bg-secondary)' }}
          >
            <span className="text-4xl">🎨</span>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[contest.status]}`}>
              {STATUS_LABELS[contest.status]}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] capitalize">
              {contest.productType}
            </span>
          </div>

          <h3 className="font-semibold text-[var(--color-text)] mb-1 group-hover:text-[var(--color-primary)] transition-colors">
            {contest.title}
          </h3>

          <p className="text-sm text-[var(--color-text-muted)] mb-3 line-clamp-2">
            {contest.description}
          </p>

          <div className="text-xs text-[var(--color-text-muted)] space-y-1">
            {contest.status === 'accepting_submissions' && (
              <p>
                <span className="font-medium">Submit by:</span>{' '}
                {formatDate(contest.submissionEnd)}
              </p>
            )}
            {contest.status === 'voting' && (
              <p>
                <span className="font-medium">Vote by:</span>{' '}
                {formatDate(contest.votingEnd)}
              </p>
            )}
            <p>
              <span className="font-medium">Submissions:</span> {submissionCount}
            </p>
            {contest.prizeDescription && (
              <p>
                <span className="font-medium">Prize:</span> {contest.prizeDescription}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
