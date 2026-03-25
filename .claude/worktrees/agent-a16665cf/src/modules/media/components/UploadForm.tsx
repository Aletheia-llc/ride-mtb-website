'use client'

import { useActionState, useEffect } from 'react'
import { Button, Input } from '@/ui/components'
import { uploadMedia, type UploadMediaState } from '../actions/uploadMedia'

export function UploadForm() {
  const [state, action, isPending] = useActionState<UploadMediaState, FormData>(
    uploadMedia,
    { errors: {} },
  )

  // Reset form on success
  useEffect(() => {
    if (state.success) {
      const form = document.querySelector<HTMLFormElement>('[data-upload-form]')
      form?.reset()
    }
  }, [state.success])

  return (
    <form action={action} data-upload-form className="space-y-4">
      {state.errors.general && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {state.errors.general}
        </div>
      )}

      {state.success && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          Media uploaded successfully!
        </div>
      )}

      {/* Media type */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="upload-media-type"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Type
        </label>
        <select
          id="upload-media-type"
          name="mediaType"
          required
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        >
          <option value="photo">Photo</option>
          <option value="video">Video</option>
        </select>
        {state.errors.mediaType && (
          <p className="text-xs text-red-500">{state.errors.mediaType}</p>
        )}
      </div>

      {/* URL */}
      <Input
        label="URL"
        name="url"
        type="url"
        required
        placeholder="https://example.com/photo.jpg"
        error={state.errors.url}
      />

      {/* Title */}
      <Input
        label="Title (optional)"
        name="title"
        type="text"
        maxLength={200}
        placeholder="Give your media a title"
        error={state.errors.title}
      />

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="upload-description"
          className="text-sm font-medium text-[var(--color-text)]"
        >
          Description (optional)
        </label>
        <textarea
          id="upload-description"
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="Describe what's in the photo or video..."
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
        {state.errors.description && (
          <p className="text-xs text-red-500">{state.errors.description}</p>
        )}
      </div>

      {/* Trail ID (optional) */}
      <Input
        label="Trail ID (optional)"
        name="trailId"
        type="text"
        placeholder="Associate with a trail"
        error={state.errors.trailId}
      />

      <Button type="submit" loading={isPending}>
        Upload Media
      </Button>
    </form>
  )
}
