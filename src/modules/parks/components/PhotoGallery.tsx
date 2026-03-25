interface Photo {
  id: string
  url: string
  caption: string | null
  user: { name: string | null }
}

interface PhotoGalleryProps {
  photos: Photo[]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  if (photos.length === 0) return null

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Photos</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption ?? 'Facility photo'}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-xs text-white">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
