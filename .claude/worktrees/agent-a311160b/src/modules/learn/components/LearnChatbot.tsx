'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface LearnChatbotProps {
  courseId?: string
}

export function LearnChatbot({ courseId }: LearnChatbotProps) {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Suppress unused variable warning — session is used implicitly via status
  void session

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && status === 'authenticated') {
      textareaRef.current?.focus()
    }
  }, [isOpen, status])

  const sendMessage = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/learn/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          courseId,
          history,
        }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setErrorMessage("You've reached the hourly limit. Try again in a bit.")
        // Remove the user message we optimistically added
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
        return
      }

      if (!res.ok) {
        setErrorMessage('Something went wrong. Please try again.')
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
        return
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      setErrorMessage('Network error. Please check your connection.')
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, messages, courseId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg hover:opacity-90 transition-opacity"
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Slide-in panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-1.5rem)] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
          style={{ height: 'min(520px, calc(100vh - 8rem))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">MTB Assistant</p>
              <p className="text-xs text-[var(--color-text-muted)]">Ask anything about MTB</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Auth gate */}
          {status !== 'authenticated' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <MessageCircle className="h-10 w-10 text-[var(--color-text-muted)]" />
              <p className="text-sm font-medium text-[var(--color-text)]">
                Sign in to use the AI assistant
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Get help with course content, technique, and MTB questions.
              </p>
              <a
                href="/signin"
                className="mt-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Sign In
              </a>
            </div>
          ) : (
            <>
              {/* Message list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-[var(--color-text-muted)] pt-4">
                    Ask me anything about mountain biking or this course.
                  </p>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface-raised)] text-[var(--color-text)]'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-xl bg-[var(--color-surface-raised)] px-4 py-3">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {errorMessage && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
                    {errorMessage}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-[var(--color-border)] p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question… (Enter to send)"
                    rows={2}
                    maxLength={1000}
                    disabled={isLoading}
                    className="flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={isLoading || !inputValue.trim()}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
                  {inputValue.length}/1000
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
