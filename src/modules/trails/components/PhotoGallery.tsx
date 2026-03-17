"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Photo {
  url: string;
  caption: string | null;
  isCover?: boolean;
}

interface PhotoGalleryProps {
  photos: Photo[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const prev = () => setLightboxIndex((i) => (i === null || i === 0 ? photos.length - 1 : i - 1));
  const next = () => setLightboxIndex((i) => (i === null ? 0 : (i + 1) % photos.length));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape") closeLightbox();
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <button
            key={index}
            onClick={() => openLightbox(index)}
            className="relative aspect-square overflow-hidden rounded-lg"
          >
            <Image
              src={photo.url}
              alt={photo.caption ?? "Trail photo"}
              fill
              className="object-cover transition-transform hover:scale-105"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-5 w-5" />
          </button>

          <button
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); prev(); }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div
            className="relative max-h-[80vh] max-w-[80vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].caption ?? "Trail photo"}
              width={1200}
              height={800}
              className="max-h-[80vh] max-w-[80vw] object-contain"
            />
            {photos[lightboxIndex].caption && (
              <p className="mt-2 text-center text-sm text-white/70">
                {photos[lightboxIndex].caption}
              </p>
            )}
          </div>

          <button
            className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); next(); }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}
