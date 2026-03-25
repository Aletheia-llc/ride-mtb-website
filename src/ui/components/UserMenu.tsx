'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  User,
  Wallet,
  Mail,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Avatar } from './Avatar'

interface UserMenuProps {
  name?: string | null
  image?: string | null
  userId: string
}

export function UserMenu({ name, image, userId: _userId }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fetch unread notification count
  useEffect(() => {
    fetch('/api/notifications/unread-count')
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const displayName = name ?? 'Account'

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full px-1.5 py-1 transition-colors hover:bg-[var(--color-bg-secondary)]"
      >
        {/* Avatar circle with notification dot */}
        <div className="relative">
          <Avatar src={image} alt={displayName} size="sm" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[8px] font-bold text-white ring-2 ring-[var(--color-bg)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <ChevronDown
          size={12}
          className={`text-[var(--color-text-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-1 shadow-lg"
          role="menu"
        >
          {/* Identity header */}
          <div className="border-b border-[var(--color-border)] px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-[var(--color-text)]">{displayName}</p>
          </div>

          <div className="py-1">
            <MenuItem href="/dashboard"     icon={<LayoutDashboard size={14} />} label="Dashboard"    close={() => setOpen(false)} />
            <MenuItem href="/profile"       icon={<User size={14} />}            label="Profile"      close={() => setOpen(false)} />
            <MenuItem href="/wallet"        icon={<Wallet size={14} />}          label="Wallet"       close={() => setOpen(false)} />
            <MenuItem href="/messages"      icon={<Mail size={14} />}            label="Messages"     close={() => setOpen(false)} />
            <MenuItem
              href="/notifications"
              icon={
                <span className="relative flex items-center justify-center">
                  <Bell size={14} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--color-primary)] text-[7px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
              }
              label="Notifications"
              close={() => setOpen(false)}
            />
          </div>

          <div className="border-t border-[var(--color-border)] py-1">
            <MenuItem href="/profile/settings" icon={<Settings size={14} />} label="Settings" close={() => setOpen(false)} />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                signOut({ callbackUrl: '/' })
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-danger)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  href,
  icon,
  label,
  close,
}: {
  href: string
  icon: React.ReactNode
  label: string
  close: () => void
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={close}
      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text)]"
    >
      {icon}
      {label}
    </Link>
  )
}
