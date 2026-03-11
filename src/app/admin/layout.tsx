import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/guards'

export const metadata: Metadata = {
  title: 'Admin | Ride MTB',
  description: 'Admin dashboard for Ride MTB',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
        <a
          href="/admin"
          className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
        >
          Dashboard
        </a>
        <a
          href="/admin/users"
          className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
        >
          Users
        </a>
      </nav>
      {children}
    </div>
  )
}
