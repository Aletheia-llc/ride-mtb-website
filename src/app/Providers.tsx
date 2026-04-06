'use client'

import { SessionProvider } from 'next-auth/react'
import { PostHogProvider } from '@/lib/analytics/PostHogProvider'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PostHogProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            },
          }}
        />
      </PostHogProvider>
    </SessionProvider>
  )
}
