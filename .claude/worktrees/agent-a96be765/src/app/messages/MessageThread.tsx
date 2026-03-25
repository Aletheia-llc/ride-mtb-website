'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { User, Send } from 'lucide-react'

type MessageData = {
  id: string
  body: string
  createdAt: string
  senderId: string
  sender: {
    id: string
    name: string | null
    username: string | null
    avatarUrl: string | null
  }
}

interface MessageThreadProps {
  conversationId: string
  currentUserId: string
  initialMessages: MessageData[]
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  if (date.toDateString() === now.toDateString()) return time

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`

  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`
}

export function MessageThread({ conversationId, currentUserId, initialMessages }: MessageThreadProps) {
  const [messages, setMessages] = useState<MessageData[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages?conversationId=${conversationId}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages)
        }
      } catch {
        // ignore polling errors
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [conversationId])

  async function handleSend() {
    const body = newMessage.trim()
    if (!body || sending) return

    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, body }),
      })
      if (res.ok) {
        const message = await res.json()
        setMessages((prev) => [...prev, message])
        setNewMessage('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      }
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--color-text-muted)]">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isOwn && (
                  <div className="shrink-0">
                    {msg.sender.avatarUrl ? (
                      <Image
                        src={msg.sender.avatarUrl}
                        alt={msg.sender.name ?? ''}
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
                        <User className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      isOwn
                        ? 'rounded-br-sm bg-[var(--color-primary)] text-white'
                        : 'rounded-bl-sm bg-[var(--color-bg-secondary)] text-[var(--color-text)]'
                    }`}
                  >
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {formatTimestamp(msg.createdAt)}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--color-border)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            aria-label="Send message"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
