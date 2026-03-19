'use client'

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Star, X, Upload, AlertCircle } from 'lucide-react'
import { uploadListingPhoto } from '@/modules/marketplace/actions/photos'

export type PhotoItem = {
  id: string
  url: string
  /** Only available when tracked locally (pre-save). Empty string when persisted. */
  filename: string
  isCover: boolean
}

type ListingPhotoUploaderProps = {
  listingId?: string
  photos: PhotoItem[]
  onPhotosChange: (photos: PhotoItem[]) => void
}

const MAX_PHOTOS = 12
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'

export function ListingPhotoUploader({
  listingId,
  photos,
  onPhotosChange,
}: ListingPhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Store pending files when no listingId yet (new listing)
  const pendingFilesRef = useRef<Map<string, File>>(new Map())

  const remaining = MAX_PHOTOS - photos.length

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      const fileArray = Array.from(files)

      // Check max photos limit
      if (photos.length + fileArray.length > MAX_PHOTOS) {
        setError(
          `You can upload at most ${MAX_PHOTOS} photos. You have ${photos.length} and selected ${fileArray.length}.`,
        )
        return
      }

      // Validate file types
      const invalidFiles = fileArray.filter(
        (f) => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
      )
      if (invalidFiles.length > 0) {
        setError('Only JPEG, PNG, and WebP images are accepted.')
        return
      }

      setUploading(true)

      const newPhotos: PhotoItem[] = []

      for (const file of fileArray) {
        try {
          if (listingId) {
            // Listing already exists — upload immediately to Vercel Blob
            const photo = await uploadListingPhoto(listingId, file)
            newPhotos.push({
              id: photo.id,
              url: photo.url,
              filename: '',
              isCover: photo.isCover,
            })
          } else {
            // New listing (not saved yet) — show preview, queue file for later
            const localId = crypto.randomUUID()
            const objectUrl = URL.createObjectURL(file)
            const isFirstPhoto = photos.length === 0 && newPhotos.length === 0
            pendingFilesRef.current.set(localId, file)
            newPhotos.push({
              id: localId,
              url: objectUrl,
              filename: file.name,
              isCover: isFirstPhoto,
            })
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Upload failed. Try again.',
          )
        }
      }

      if (newPhotos.length > 0) {
        onPhotosChange([...photos, ...newPhotos])
      }

      setUploading(false)
    },
    [photos, onPhotosChange, listingId],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files)
      }
      // Reset the input so the same file can be re-selected
      e.target.value = ''
    },
    [uploadFiles],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files)
      }
    },
    [uploadFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleSetCover = useCallback(
    (photoId: string) => {
      const updated = photos.map((p) => ({
        ...p,
        isCover: p.id === photoId,
      }))
      onPhotosChange(updated)
    },
    [photos, onPhotosChange],
  )

  const handleRemove = useCallback(
    (photoId: string) => {
      const removed = photos.find((p) => p.id === photoId)
      let updated = photos.filter((p) => p.id !== photoId)

      // Revoke object URL for locally-tracked photos
      if (removed && pendingFilesRef.current.has(photoId)) {
        URL.revokeObjectURL(removed.url)
        pendingFilesRef.current.delete(photoId)
      }

      // If we removed the cover, promote the first remaining photo
      if (removed?.isCover && updated.length > 0) {
        updated = updated.map((p, i) => ({
          ...p,
          isCover: i === 0,
        }))
      }

      onPhotosChange(updated)
    },
    [photos, onPhotosChange],
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Section heading */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          Photos
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={uploading || remaining <= 0}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          remaining <= 0
            ? 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-surface)] opacity-50'
            : dragOver
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)]'
        }`}
      >
        {uploading ? (
          <>
            <Upload className="h-8 w-8 animate-pulse text-[var(--color-primary)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">
              Uploading...
            </span>
          </>
        ) : remaining <= 0 ? (
          <>
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <span className="text-sm font-medium text-[var(--color-text)]">
              Maximum {MAX_PHOTOS} photos reached
            </span>
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-[var(--color-text-muted)]" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[var(--color-text)]">
                Drag &amp; drop photos here or click to browse
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                JPEG, PNG, or WebP &middot; up to 10 MB each &middot;{' '}
                {remaining} remaining
              </span>
            </div>
          </>
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.filename || 'listing photo'}
                className="h-full w-full object-cover"
              />

              {/* Cover badge */}
              {photo.isCover && (
                <div className="absolute left-1 top-1 flex items-center gap-1 rounded bg-[var(--color-primary)]/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  <Star className="h-3 w-3 fill-current" />
                  Cover
                </div>
              )}

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {/* Set as cover */}
                {!photo.isCover && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetCover(photo.id)
                    }}
                    title="Set as cover photo"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-[var(--color-primary)]/80"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}

                {/* Remove */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(photo.id)
                  }}
                  title="Remove photo"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-red-500/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tip text */}
      <p className="text-xs text-[var(--color-text-muted)]">
        Include photos of any damage or wear. The first photo (or the one marked
        with a star) will be the cover image shown in search results.
      </p>
    </div>
  )
}
