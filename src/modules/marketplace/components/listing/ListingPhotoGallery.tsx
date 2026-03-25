'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import type { ListingPhoto } from '@/modules/marketplace/types'

interface ListingPhotoGalleryProps {
  photos: ListingPhoto[]
}

export function ListingPhotoGallery({ photos }: ListingPhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex flex-col items-center gap-2 text-[var(--color-dim)]">
          <ImageOff className="h-12 w-12" />
          <span className="text-sm">No photos available</span>
        </div>
      </div>
    )
  }

  const selected = photos[selectedIndex]

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Image
          src={selected.url}
          alt={`Listing photo ${selectedIndex + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-contain"
          priority
        />
        {/* Photo count indicator */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {selectedIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                index === selectedIndex
                  ? 'border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }`}
            >
              <Image
                src={photo.url}
                alt={`Listing photo ${index + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
