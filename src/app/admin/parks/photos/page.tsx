import { requireAdmin } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { FacilityPhotoStatus } from '@/generated/prisma/client'
import { approveFacilityPhoto, rejectFacilityPhoto } from '@/modules/parks/actions/photos'
import { getAdminSupabase } from '@/modules/parks/lib/supabase'

export const metadata = { title: 'Photo Queue | Admin' }

export default async function AdminParksPhotosPage() {
  await requireAdmin()

  const photos = await db.facilityPhoto.findMany({
    where: { status: FacilityPhotoStatus.PENDING },
    orderBy: { createdAt: 'asc' },
    include: {
      facility: { select: { name: true, stateSlug: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
  })

  const supabase = getAdminSupabase()

  const photosWithUrls = photos.map((p) => ({
    ...p,
    url: supabase.storage.from('facility-photos').getPublicUrl(p.storageKey).data.publicUrl,
  }))

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Photo Moderation Queue</h1>

      {photosWithUrls.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">No photos pending review.</p>
      ) : (
        <div className="space-y-4">
          {photosWithUrls.map((photo) => (
            <div key={photo.id} className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Pending photo"
                className="h-24 w-24 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--color-text)]">{photo.facility.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  By {photo.user.name ?? photo.user.email} · {new Date(photo.createdAt).toLocaleDateString('en-US')}
                </p>
                {photo.caption && (
                  <p className="mt-1 text-sm italic text-[var(--color-text-muted)]">&ldquo;{photo.caption}&rdquo;</p>
                )}
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  photo.aiVerdict === 'APPROVED' ? 'bg-green-500/10 text-green-700' :
                  photo.aiVerdict === 'FLAGGED' ? 'bg-yellow-500/10 text-yellow-700' :
                  'bg-gray-500/10 text-gray-600'
                }`}>
                  AI: {photo.aiVerdict ?? 'N/A'}
                </span>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <form action={approveFacilityPhoto.bind(null, photo.id)}>
                  <button
                    type="submit"
                    className="rounded px-3 py-1.5 text-sm font-medium bg-green-500 text-white hover:bg-green-600"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectFacilityPhoto.bind(null, photo.id)}>
                  <button
                    type="submit"
                    className="rounded px-3 py-1.5 text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
