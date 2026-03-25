'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadFacilityPhoto } from '../actions/photos'

interface PhotoUploadProps {
  facilityId: string
}

export function PhotoUpload({ facilityId }: PhotoUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await uploadFacilityPhoto(facilityId, formData)
      if (result.success) {
        setSuccess(true)
        formRef.current?.reset()
        setTimeout(() => setSuccess(false), 4000)
      } else {
        setError(result.error ?? 'Upload failed')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="photo-file" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Add a Photo
        </label>
        <input
          id="photo-file"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="block text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded file:border-0 file:bg-[var(--color-surface)] file:px-3 file:py-1 file:text-sm"
        />
      </div>
      <div>
        <label htmlFor="photo-caption" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Caption (optional)
        </label>
        <input
          id="photo-caption"
          name="caption"
          type="text"
          maxLength={120}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          placeholder="Describe the photo..."
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">Photo submitted for review!</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? 'Uploading...' : 'Upload Photo'}
      </button>
    </form>
  )
}
