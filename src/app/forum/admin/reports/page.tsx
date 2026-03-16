import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, FileText, MessageSquare } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'

export const metadata: Metadata = {
  title: 'Reports Queue | Forum Admin | Ride MTB',
}

const STATUS_OPTIONS = ['pending', 'resolved', 'dismissed'] as const
type StatusOption = typeof STATUS_OPTIONS[number]

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function ForumReportsPage({ searchParams }: PageProps) {
  const session = await auth()
  const userRole = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || userRole !== 'admin') redirect('/forum')

  const params = await searchParams
  const statusFilter: StatusOption = STATUS_OPTIONS.includes(params.status as StatusOption)
    ? (params.status as StatusOption)
    : 'pending'

  const [reports, openCount] = await Promise.all([
    db.report.findMany({
      where: { status: statusFilter },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        reporter: { select: { id: true, username: true, name: true } },
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
            author: { select: { username: true } },
          },
        },
        comment: {
          select: {
            id: true,
            body: true,
            author: { select: { username: true } },
          },
        },
      },
    }),
    db.report.count({ where: { status: 'pending' } }),
  ])

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    if (overrides.status) p.set('status', overrides.status)
    return `/forum/admin/reports?${p.toString()}`
  }

  function getContentPreview(report: typeof reports[0]) {
    if (report.comment) return report.comment.body.slice(0, 200)
    if (report.post) return report.post.title
    return 'Content unavailable'
  }

  function getTargetLink(report: typeof reports[0]) {
    if (report.post) return `/forum/thread/${report.post.slug}`
    return null
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'dismissed': return 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
      default: return ''
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text)]">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Reports Queue
          <span className="text-sm font-normal text-[var(--color-text-muted)]">({openCount} open)</span>
        </h1>
        <Link href="/forum" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          ← Back to Forum
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={buildUrl({ status: s })}
            className={[
              'px-4 py-2 text-sm font-medium capitalize transition-colors',
              statusFilter === s
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Reports */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-16 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-[var(--color-text-muted)]" />
          <p className="text-[var(--color-text-muted)]">No reports found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const contentPreview = getContentPreview(report)
            const targetLink = getTargetLink(report)
            const targetType = report.comment ? 'COMMENT' : report.post ? 'POST' : 'USER'

            return (
              <div key={report.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                    {targetType === 'POST' ? <FileText className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    {targetType}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {new Date(report.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="mb-2 rounded-lg bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text)]">
                  {contentPreview}
                </div>

                <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                  <span className="font-medium">Reason:</span> {report.reason}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                    <span>
                      Reported by{' '}
                      {report.reporter.username ? (
                        <Link href={`/forum/user/${report.reporter.username}`} className="text-[var(--color-text)] hover:text-[var(--color-primary)]">
                          @{report.reporter.username}
                        </Link>
                      ) : (
                        (report.reporter.name ?? 'Unknown')
                      )}
                    </span>
                    {targetLink && (
                      <Link href={targetLink} className="hover:text-[var(--color-primary)]">
                        View content →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
