'use client'
import { useActionState } from 'react'
import Image from 'next/image'
import type { PhotoState } from '../../actions/uploadShopPhoto'

interface Photo {
  id: string
  url: string
  isPrimary: boolean
  sortOrder: number
}

interface Props {
  photos: Photo[]
  uploadAction: (prev: PhotoState, formData: FormData) => Promise<PhotoState>
  deleteAction: (photoId: string) => Promise<PhotoState>
  setCoverAction: (photoId: string) => Promise<PhotoState>
}

export function PhotosTab({ photos, uploadAction, deleteAction, setCoverAction }: Props) {
  const [state, formAction, pending] = useActionState(uploadAction, { errors: {} })

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <form action={formAction} className="space-y-3">
        <h2 className="font-medium">Add Photo ({photos.length}/10)</h2>
        <input type="file" name="photo" accept="image/*" className="block" required />
        {state.errors.general && <p className="text-red-600 text-sm">{state.errors.general}</p>}
        {state.success && <p className="text-green-600 text-sm">Photo uploaded.</p>}
        <button type="submit" disabled={pending || photos.length >= 10} className="btn btn-primary">
          {pending ? 'Uploading…' : 'Upload Photo'}
        </button>
      </form>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group rounded overflow-hidden border border-[var(--color-border)]">
            <Image src={photo.url} alt="" width={200} height={150} className="w-full h-36 object-cover" />
            {photo.isPrimary && (
              <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">Cover</span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {!photo.isPrimary && (
                <button
                  onClick={() => setCoverAction(photo.id)}
                  className="btn text-xs py-1 px-2"
                >
                  Set Cover
                </button>
              )}
              <button
                onClick={() => deleteAction(photo.id)}
                className="btn text-xs py-1 px-2 text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
