import { getSupabaseClient } from './client'

export const BUCKET = 'ridemtb-assets'

export const StorageFolders = {
  avatars: 'avatars',
  gearReviews: 'gear-reviews',
  events: 'events',
  courses: 'courses',
  trailSystems: 'trail-systems',
  shops: 'shops',
  marketplace: 'marketplace',
} as const

export type StorageFolder = (typeof StorageFolders)[keyof typeof StorageFolders]

/** Returns the public CDN URL for a stored asset. */
export function getPublicUrl(folder: StorageFolder, filename: string): string {
  const { data } = getSupabaseClient().storage
    .from(BUCKET)
    .getPublicUrl(`${folder}/${filename}`)
  return data.publicUrl
}

/** Uploads a file and returns its public URL. */
export async function uploadFile(
  folder: StorageFolder,
  filename: string,
  file: File,
): Promise<string> {
  const path = `${folder}/${filename}`
  const { error } = await getSupabaseClient().storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '31536000', // 1 year
  })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return getPublicUrl(folder, filename)
}

/** Deletes a file from storage. */
export async function deleteFile(
  folder: StorageFolder,
  filename: string,
): Promise<void> {
  const { error } = await getSupabaseClient().storage
    .from(BUCKET)
    .remove([`${folder}/${filename}`])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}
