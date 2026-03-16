'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/forum/notifications')
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount ?? 0))
      .catch(() => {})
  }, [])

  return (
    <Link href="/forum/notifications" className="relative inline-flex items-center p-1.5">
      <Bell className="h-5 w-5 text-[var(--color-text-muted)]" />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
