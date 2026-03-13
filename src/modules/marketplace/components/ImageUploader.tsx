'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, ImageIcon } from 'lucide-react'

interface ImageUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
}

export function ImageUploader({ value, onChange, maxImages = 8 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    const remaining = maxImages - value.length
    if (remaining <= 0) return

    setError(null)
    setUploading(true)

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const invalidFile = Array.from(files).find((f) => !allowedTypes.includes(f.type))
    if (invalidFile) {
      setError(`${invalidFile.name}: only JPEG, PNG, and WebP files are supported`)
      setUploading(false)
      return
    }

    const toUpload = Array.from(files).slice(0, remaining)
    const results: string[] = []

    for (const file of toUpload) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/marketplace/images', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Upload failed')
        break
      }
      const { url } = await res.json()
      results.push(url)
    }

    onChange([...value, ...results])
    setUploading(false)
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url, i) => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--color-border)]">
            <Image src={url} alt={`Image ${i + 1}`} fill className="object-cover" sizes="150px" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">Cover</span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <Upload size={20} />
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {value.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <ImageIcon size={12} />
          First image will be used as the cover photo. Up to {maxImages} images.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  )
}
