'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { submitVideo } from '../actions/submitVideo'
import { TagConfirmationForm } from './TagConfirmationForm'

type VideoStatus = 'queued' | 'processing' | 'transcoding' | 'pending_review' | 'live' | 'rejected'

interface Video {
  id: string
  title: string
  thumbnailUrl: string | null
  status: VideoStatus
  viewCount: number
  createdAt: Date
  tags: Array<{ id: string; value: string; source: string; confirmed: boolean }>
  _count: { impressions: number }
}

interface VideoListProps {
  videos: Video[]
}

const STATUS_LABELS: Record<VideoStatus, { label: string; className: string }> = {
  queued:         { label: 'Queued',          className: 'bg-gray-500/10 text-gray-500' },
  processing:     { label: 'Processing',      className: 'bg-blue-500/10 text-blue-600' },
  transcoding:    { label: 'Transcoding',     className: 'bg-purple-500/10 text-purple-600' },
  pending_review: { label: 'Needs Review',    className: 'bg-yellow-500/10 text-yellow-600' },
  live:           { label: 'Live',            className: 'bg-green-500/10 text-green-600' },
  rejected:       { label: 'Rejected',        className: 'bg-red-500/10 text-red-600' },
}

type SubmitState = { errors: Record<string, string>; success?: boolean }
const initialState: SubmitState = { errors: {} }

export function VideoList({ videos }: VideoListProps) {
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(
    submitVideo as (s: SubmitState, f: FormData) => Promise<SubmitState>,
    initialState,
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Submit form */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Submit a Video</h3>
        <form action={formAction} className="flex gap-2">
          <input
            name="youtubeUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            required
            className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Submitting…' : 'Submit'}
          </button>
        </form>
        {state.errors.general && (
          <p className="mt-2 text-xs text-red-500">{state.errors.general}</p>
        )}
        {state.success && (
          <p className="mt-2 text-xs text-green-600">Video queued for processing!</p>
        )}
      </div>

      {/* Video list */}
      {videos.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <p className="mb-2 text-4xl">🎬</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            No videos yet. Submit a YouTube URL above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((video) => {
            const statusInfo = STATUS_LABELS[video.status]
            return (
              <div
                key={video.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="flex items-center gap-3 p-4">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-14 w-24 rounded object-cover"
                    />
                  ) : (
                    <div className="h-14 w-24 rounded bg-[var(--color-bg-secondary)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-text)]">
                      {video.title}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {video.viewCount.toLocaleString()} views
                      </span>
                    </div>
                  </div>
                  {video.status === 'pending_review' && (
                    <button
                      onClick={() => setExpandedId(expandedId === video.id ? null : video.id)}
                      className="rounded bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-600 hover:bg-yellow-500/20"
                    >
                      Review Tags
                    </button>
                  )}
                  {video.status === 'live' && (
                    <a
                      href={`/creators/videos/${video.id}`}
                      className="rounded bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
                    >
                      View
                    </a>
                  )}
                </div>
                {expandedId === video.id && video.status === 'pending_review' && (
                  <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3">
                    <TagConfirmationForm videoId={video.id} tags={video.tags} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
