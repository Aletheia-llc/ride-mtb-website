import { requireAuth } from '@/lib/auth/guards'
import { getConversations } from '@/modules/marketplace/actions/messages'
import { ConversationList } from '@/modules/marketplace/components/messaging/ConversationList'
import type { ConversationWithDetails } from '@/modules/marketplace/types'

export default async function MyMessagesPage() {
  const user = await requireAuth()
  const raw = await getConversations()

  // Remap buyer/seller → otherParty to match ConversationWithDetails shape
  const conversations = raw.map((c) => {
    const otherParty = c.buyerId === user.id ? c.seller : c.buyer
    const lastMessage = c.messages[0] ?? null
    const unreadCount = c.buyerId === user.id ? c.buyerUnread : c.sellerUnread

    return {
      ...c,
      listing: {
        ...c.listing,
        photos: c.listing.photos.map((p) => ({ url: p.url, isCover: false })),
      },
      otherParty,
      lastMessage: lastMessage
        ? {
            body: lastMessage.body,
            createdAt: lastMessage.createdAt,
            isSystemMessage: lastMessage.isSystemMessage,
          }
        : null,
      unreadCount,
    }
  }) as unknown as ConversationWithDetails[]

  return (
    <div>
      <h1>Messages</h1>
      <ConversationList conversations={conversations} />
    </div>
  )
}
