'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface SearchModalProps {
  onClose: () => void
}

export function SearchModal({ onClose }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl mx-4">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 shadow-2xl"
        >
          <Search className="shrink-0 text-[var(--color-text-muted)]" size={18} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search trails, forum, bikes, courses…"
            className="flex-1 bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none text-base"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <X size={16} />
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">
          Press{' '}
          <kbd className="rounded bg-[var(--color-bg-secondary)] px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
          {' '}to search ·{' '}
          <kbd className="rounded bg-[var(--color-bg-secondary)] px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
          {' '}to close
        </p>
      </div>
    </div>
  )
}
