'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertTriangle, Trash2, CheckCircle, Shield } from 'lucide-react'
import type { ReportWithDetails } from '@/modules/marketplace/types'
import { removeListings } from '@/modules/marketplace/actions/admin'
import { resolveReport } from '@/modules/marketplace/actions/reports'

const REASON_LABELS: Record<string, string> = {
  scam: 'Scam / Fraud',
  prohibited_item: 'Prohibited Item',
  wrong_category: 'Wrong Category',
  offensive: 'Offensive Content',
  other: 'Other',
}

interface ReportsListProps {
  initialReports: ReportWithDetails[]
}

/** Group reports by listing */
function groupByListing(reports: ReportWithDetails[]) {
  const groups = new Map<
    string,
    {
      listing: ReportWithDetails['listing']
      reports: ReportWithDetails[]
    }
  >()

  for (const report of reports) {
    const existing = groups.get(report.listingId)
    if (existing) {
      existing.reports.push(report)
    } else {
      groups.set(report.listingId, {
        listing: report.listing,
        reports: [report],
      })
    }
  }

  return [...groups.entries()].sort(
    (a, b) => b[1].reports.length - a[1].reports.length,
  )
}

export function ReportsList({ initialReports }: ReportsListProps) {
  const [reports, setReports] = useState(initialReports)
  const [isPending, startTransition] = useTransition()
  const grouped = groupByListing(reports)

  function handleRemoveListing(listingId: string) {
    const reason = prompt('Reason for removal:')
    if (!reason) return
    startTransition(async () => {
      await removeListings(listingId, reason)
      // Resolve all reports for this listing by resolving them individually
      const listingReports = reports.filter((r) => r.listingId === listingId)
      await Promise.all(listingReports.map((r) => resolveReport(r.id, 'removed')))
      setReports((prev) => prev.filter((r) => r.listingId !== listingId))
    })
  }

  function handleDismissAll(listingId: string) {
    startTransition(async () => {
      const listingReports = reports.filter((r) => r.listingId === listingId)
      await Promise.all(listingReports.map((r) => resolveReport(r.id, 'dismissed')))
      setReports((prev) => prev.filter((r) => r.listingId !== listingId))
    })
  }

  function handleResolveOne(reportId: string) {
    startTransition(async () => {
      await resolveReport(reportId, 'dismissed')
      setReports((prev) => prev.filter((r) => r.id !== reportId))
    })
  }

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-16">
        <Shield className="h-10 w-10 text-[var(--color-text-muted)]" />
        <p className="text-[var(--color-text-muted)]">No unresolved reports</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        {reports.length} unresolved report{reports.length !== 1 ? 's' : ''}{' '}
        across {grouped.length} listing{grouped.length !== 1 ? 's' : ''}
      </p>

      {grouped.map(([listingId, group]) => (
        <div
          key={listingId}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
        >
          {/* Listing header */}
          <div className="flex items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)] p-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg)]">
              {group.listing.photos[0] ? (
                <Image
                  src={group.listing.photos[0].url}
                  alt={group.listing.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)] text-[10px]">
                  No img
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <Link
                href={`/marketplace/${group.listing.slug}`}
                className="block truncate font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
              >
                {group.listing.title}
              </Link>
              <span className="text-xs text-[var(--color-text-muted)]">
                Seller: {group.listing.seller.name ?? group.listing.seller.email ?? 'Unknown'}
              </span>
            </div>

            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-500">
              <AlertTriangle className="h-3 w-3" />
              {group.reports.length} report{group.reports.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Reports */}
          <div className="divide-y divide-[var(--color-border)]">
            {group.reports.map((report) => (
              <div
                key={report.id}
                className="flex items-start gap-3 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {report.reporter.name ?? report.reporter.email ?? 'Unknown'}
                    </span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {report.body && (
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {report.body}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleResolveOne(report.id)}
                  disabled={isPending}
                  title="Dismiss this report"
                  className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Group actions */}
          <div className="flex items-center gap-2 border-t border-[var(--color-border)] p-3">
            <button
              onClick={() => handleRemoveListing(listingId)}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Listing
            </button>
            <button
              onClick={() => handleDismissAll(listingId)}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] hover:border-[var(--color-border-hover)] disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Dismiss All Reports
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
