'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, User } from 'lucide-react'
import Image from 'next/image'

type SearchResult = {
  id: string
  name: string | null
  username: string | null
  avatarUrl: string | null
}

export function NewMessageButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/conversations/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }, [])

  function handleSelectUser(userId: string) {
    setIsOpen(false)
    setQuery('')
    setResults([])
    router.push(`/messages?to=${userId}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        New Message
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">New Message</h2>
              <input
                type="text"
                autoFocus
                placeholder="Search users by name or username..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  searchUsers(e.target.value)
                }}
                className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              />

              <div className="max-h-48 overflow-y-auto">
                {searching && (
                  <p className="py-2 text-center text-sm text-[var(--color-text-muted)]">Searching...</p>
                )}
                {!searching && query && results.length === 0 && (
                  <p className="py-2 text-center text-sm text-[var(--color-text-muted)]">No users found.</p>
                )}
                {results.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--color-bg-secondary)]"
                  >
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.name ?? ''}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
                        <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-[var(--color-text)]">
                        {user.name ?? user.username ?? 'Unknown'}
                      </div>
                      {user.username && (
                        <div className="text-xs text-[var(--color-text-muted)]">@{user.username}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-3 w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
