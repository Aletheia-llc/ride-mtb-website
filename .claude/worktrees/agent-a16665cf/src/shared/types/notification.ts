export interface AppNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  linkUrl: string | null
  read: boolean
  createdAt: Date
}
