import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth/guards'
import { getConversation } from '@/modules/marketplace/actions/messages'
import { ConversationThread } from '@/modules/marketplace/components/messaging/ConversationThread'
import type { ConversationFull } from '@/modules/marketplace/types'

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params
  const user = await requireAuth()

  let rawConversation: Awaited<ReturnType<typeof getConversation>>
  try {
    rawConversation = await getConversation(conversationId)
  } catch {
    notFound()
  }

  // Shape the raw result into ConversationFull (otherParty = the non-current-user side)
  const otherParty =
    rawConversation.buyerId === user.id ? rawConversation.seller : rawConversation.buyer

  const conversation: ConversationFull = {
    ...rawConversation,
    listing: {
      ...rawConversation.listing,
      photos: rawConversation.listing.photos.map((p) => ({ url: p.url, isCover: false })),
    },
    messages: rawConversation.messages,
    otherParty,
  }

  return <ConversationThread conversation={conversation} currentUserId={user.id} />
}
