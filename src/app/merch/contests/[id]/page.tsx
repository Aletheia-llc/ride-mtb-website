import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { getContest } from '@/modules/merch/actions/contests'
import { VoteButton } from '@/modules/merch/components/VoteButton'

interface ContestDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ContestDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const contest = await getContest(id)
  if (!contest) return { title: 'Contest Not Found' }
  return {
    title: `${contest.title} | Ride MTB Merch`,
    description: contest.description,
  }
}

const STATUS_LABELS: Record<string, string> = {
  accepting_submissions: 'Open for Submissions',
  voting: 'Voting Open',
  closed: 'Closed',
  winner_announced: 'Winner Announced',
  in_production: 'In Production',
  completed: 'Completed',
}

export default async function ContestDetailPage({ params }: ContestDetailPageProps) {
  const { id } = await params
  const [contest, session] = await Promise.all([getContest(id), auth()])

  if (!contest) notFound()

  const isAuthenticated = !!session?.user?.id
  const isVotingOpen = contest.status === 'voting'
  const isAcceptingSubmissions = contest.status === 'accepting_submissions'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {contest.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contest.coverImageUrl}
            alt={contest.title}
            className="w-full h-48 object-cover rounded-lg mb-6"
          />
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
                {STATUS_LABELS[contest.status] ?? contest.status}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] capitalize">
                {contest.productType}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">{contest.title}</h1>
            <p className="mt-2 text-[var(--color-text-muted)]">{contest.description}</p>
          </div>
        </div>

        {contest.prizeDescription && (
          <div className="mt-4 p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            <p className="text-sm font-semibold text-[var(--color-text)]">Prize</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{contest.prizeDescription}</p>
          </div>
        )}

        {isAcceptingSubmissions && isAuthenticated && (
          <div className="mt-4">
            <a
              href={`/merch/contests/${contest.id}/submit`}
              className="inline-block px-6 py-2.5 rounded font-medium text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              Submit Your Design
            </a>
          </div>
        )}

        {isAcceptingSubmissions && !isAuthenticated && (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            <a href="/auth/signin" className="underline" style={{ color: 'var(--color-primary)' }}>
              Sign in
            </a>{' '}
            to submit your design.
          </p>
        )}
      </div>

      {/* Submissions Gallery */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">
          Submissions ({contest.submissions.length})
        </h2>

        {contest.submissions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[var(--color-border)] rounded-lg">
            <p className="text-[var(--color-text-muted)]">No submissions yet.</p>
            {isAcceptingSubmissions && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Be the first!</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {contest.submissions.map((submission) => {
              const hasVotedForThis = contest.userVotedForId === submission.id
              return (
                <div
                  key={submission.id}
                  className={`rounded-lg border overflow-hidden bg-[var(--color-surface)] ${
                    submission.isWinner
                      ? 'border-yellow-400'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {submission.isWinner && (
                    <div className="bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-1 px-2">
                      WINNER
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={submission.imageUrl}
                    alt={submission.title}
                    className="w-full h-48 object-cover"
                  />
                  {submission.mockupUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={submission.mockupUrl}
                      alt={`${submission.title} mockup`}
                      className="w-full h-32 object-cover border-t border-[var(--color-border)]"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-[var(--color-text)] truncate">
                          {submission.title}
                        </h3>
                        {submission.description && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2">
                            {submission.description}
                          </p>
                        )}
                      </div>
                      <VoteButton
                        submissionId={submission.id}
                        voteCount={submission.voteCount}
                        hasVoted={hasVotedForThis}
                        isVotingOpen={isVotingOpen}
                        isAuthenticated={isAuthenticated}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
