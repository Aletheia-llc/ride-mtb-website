'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface GpxUploadFormProps {
  trailId: string
  trailName: string
  hasExistingTrack: boolean
}

export function GpxUploadForm({
  trailId,
  trailName,
  hasExistingTrack,
}: GpxUploadFormProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setStatus('uploading')
    setMessage('')

    const form = new FormData()
    form.append('file', file)
    form.append('trailId', trailId)

    try {
      const res = await fetch('/api/trails/gpx', { method: 'POST', body: form })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(
          `Uploaded ${data.pointCount} points · ${data.distance} mi · ${data.elevationGain}ft gain`,
        )
        router.refresh()
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Upload failed')
      }
    } catch {
      setStatus('error')
      setMessage('Network error — please try again')
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-[var(--color-border)] p-4">
      <h3 className="mb-1 text-sm font-semibold text-[var(--color-text)]">
        Contribute GPS Track
      </h3>
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        {hasExistingTrack
          ? 'This trail already has a GPS track. Uploading a new file will replace it.'
          : `Upload a GPX file to add a GPS track for ${trailName}.`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".gpx"
          disabled={status === 'uploading'}
          className="text-sm text-[var(--color-text)] file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-[var(--color-bg-secondary)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--color-text)] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={status === 'uploading'}
          className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'uploading' ? 'Uploading…' : 'Upload GPX'}
        </button>
      </div>

      {status === 'success' && (
        <p className="mt-3 text-sm font-medium text-green-600">{message}</p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm font-medium text-red-600">{message}</p>
      )}
    </div>
  )
}
