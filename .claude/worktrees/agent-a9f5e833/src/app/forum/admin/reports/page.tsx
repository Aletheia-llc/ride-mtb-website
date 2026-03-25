import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, FileText, MessageSquare, User } from 'lucide-react'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { ModReportActions } from '@/modules/forum/components/ModReportActions'

export const metadata: Metadata = {
  title: 'Reports Queue | Forum Admin | Ride MTB',
}

const STATUS_OPTIONS = ['OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED'] as const
const TYPE_OPTIONS = ['POST', 'THREAD', 'USER'] as const

interface PageProps {
  searchParams: Promise<{ status?: string; type?: string }>
}

export default async function ForumReportsPage({ searchParams }: PageProps) {
  const session = await auth()
  const userRole = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || userRole !== 'admin') redirect('/forum')

  const params = await searchParams
  const statusFilter = STATUS_OPTIONS.includes(params.status as typeof STATUS_OPTIONS[number])
    ? (params.status as typeof STATUS_OPTIONS[number])
    : 'OPEN'
  const typeFilter = TYPE_OPTIONS.includes(params.type as typeof TYPE_OPTIONS[number])
    ? (params.type as typeof TYPE_OPTIONS[number])
    : undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: statusFilter }
  if (typeFilter) where.targetType = typeFilter

  const [reports, openCount] = await Promise.all([
    db.forumReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        reporter: { select: { id: true, username: true, name: true } },
        post: {
          select: {
            id: true,
            content: true,
            authorId: true,
            author: { select: { username: true } },
            thread: { select: { slug: true, title: true } },
          },
        },
        thread: {
          select: { id: true, title: true, slug: true },
        },
      },
    }),
    db.forumReport.count({ where: { status: 'OPEN' } }),
  ])

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    if (overrides.status) params.set('status', overrides.status)
    if (overrides.type) params.set('type', overrides.type)
    return `/forum/admin/reports?${params.toString()}`
  }

  function getTargetIcon(type: string) {
    if (type === 'POST') return <FileText className="h-3.5 w-3.5" />
    if (type === 'THREAD') return <MessageSquare className="h-3.5 w-3.5" />
    return <User className="h-3.5 w-3.5" />
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'REVIEWED': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'RESOLVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'DISMISSED': return 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
      default: return ''
    }
  }

  function getContentPreview(report: typeof reports[0]) {
    if (report.targetType === 'POST' && report.post) return report.post.content.slice(0, 200)
    if (report.targetType === 'THREAD' && report.thread) return report.thread.title
    return 'Content unavailable'
  }

  function getTargetLink(report: typeof reports[0]) {
    if (report.targetType === 'POST' && report.post?.thread) {
      return `/forum/thread/${report.post.thread.slug}`
    }
    if (report.targetType === 'THREAD' && report.thread) {
      return `/forum/thread/${report.thread.slug}`
    }
    return null
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
            href={buildUrl({ status: s, ...(typeFilter ? { type: typeFilter } : {}) })}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              statusFilter === s
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Type filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={buildUrl({ status: statusFilter })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!typeFilter ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
        >
          All types
        </Link>
        {TYPE_OPTIONS.map((t) => (
          <Link
            key={t}
            href={buildUrl({ status: statusFilter, type: t })}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${typeFilter === t ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          >
            {getTargetIcon(t)}
            {t}
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
            const authorId = report.post?.authorId ?? null

            return (
              <div key={report.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                    {getTargetIcon(report.targetType)}
                    {report.targetType}
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

                  {report.status === 'OPEN' && (
                    <ModReportActions
                      reportId={report.id}
                      targetType={report.targetType as 'POST' | 'THREAD' | 'USER'}
                      postId={report.postId}
                      threadId={report.threadId}
                      authorId={authorId}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
