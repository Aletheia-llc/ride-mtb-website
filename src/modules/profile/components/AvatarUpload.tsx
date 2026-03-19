'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Camera, Loader2, X } from 'lucide-react'
import { Avatar } from '@/ui/components/Avatar'

interface AvatarUploadProps {
  currentAvatarUrl: string | null
  currentImage: string | null
  displayName: string
}

export function AvatarUpload({ currentAvatarUrl, currentImage, displayName }: AvatarUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImgSrc(reader.result as string)
      setIsModalOpen(true)
      setError(null)
      setCrop(undefined)
    }
    reader.readAsDataURL(file)
    // Reset so the same file can be re-selected if needed
    e.target.value = ''
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height))
  }

  function getCroppedBlob(): Promise<Blob> {
    const image = imgRef.current
    if (!image || !crop) throw new Error('No crop selected')

    const canvas = document.createElement('canvas')
    const SIZE = 400
    canvas.width = SIZE
    canvas.height = SIZE

    const ctx = canvas.getContext('2d')!

    const pixelCrop = convertToPixelCrop(crop, image.naturalWidth, image.naturalHeight)
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0, 0, SIZE, SIZE,
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas produced no output'))),
        'image/jpeg',
        0.9,
      )
    })
  }

  async function handleUpload() {
    try {
      setIsUploading(true)
      setError(null)

      const blob = await getCroppedBlob()
      const formData = new FormData()
      formData.append('file', blob, 'avatar.jpg')

      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 422) {
          setError("Photo didn't pass our content guidelines. Please choose a different image.")
        } else {
          setError('Upload failed. Please try again.')
        }
        return
      }

      setIsModalOpen(false)
      router.refresh()
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      {/* Avatar trigger */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative"
          aria-label="Change profile photo"
        >
          <Avatar
            src={currentAvatarUrl ?? currentImage}
            alt={displayName}
            size="xl"
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-7 w-7 text-white" />
          </span>
        </button>
        <p className="text-xs text-[var(--color-text-muted)]">Click to change photo</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onSelectFile}
      />

      {/* Crop modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-[var(--color-bg)] p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
              Crop your photo
            </h2>

            <ReactCrop
              crop={crop}
              onChange={setCrop}
              aspect={1}
              circularCrop
              className="max-h-72 w-full overflow-hidden rounded-lg"
            >
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-72 w-full object-contain"
              />
            </ReactCrop>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !crop}
                className="inline-flex items-center gap-2 justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isUploading ? 'Uploading…' : 'Upload Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
