'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { sendMessage } from '@/modules/marketplace/actions/messages'

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const canSend = body.trim().length > 0 && !isPending

  function handleSubmit() {
    if (!canSend) return

    const trimmed = body.trim()
    setBody('')

    startTransition(async () => {
      try {
        await sendMessage(conversationId, trimmed)
        router.refresh()
      } catch {
        // Restore message on error so the user can retry
        setBody(trimmed)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isPending}
          className="flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white transition-colors hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
