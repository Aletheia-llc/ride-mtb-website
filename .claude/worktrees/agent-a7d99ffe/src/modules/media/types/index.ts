export type MediaType = 'photo' | 'video'

export interface MediaItemData {
  id: string
  userId: string
  mediaType: MediaType
  url: string
  thumbnailUrl: string | null
  title: string | null
  description: string | null
  trailId: string | null
  rideLogId: string | null
  width: number | null
  height: number | null
  fileSize: number | null
  createdAt: Date
  userName: string | null
  userImage: string | null
}
