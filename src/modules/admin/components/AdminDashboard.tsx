import Link from 'next/link'
import { Card } from '@/ui/components'
import type { AdminStats } from '../types'
import {
  Users,
  MessageSquare,
  Mountain,
  CalendarDays,
  Star,
  ShoppingBag,
  Store,
  MapPin,
  Wrench,
  AlertCircle,
  Flame,
  UserPlus,
} from 'lucide-react'

interface AdminDashboardProps {
  stats: AdminStats
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Pending Actions — urgent items */}
      {(stats.pendingShopClaims > 0 || stats.pendingShopSubmissions > 0) && (
        <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-500">
            <AlertCircle className="h-4 w-4" />
            Needs Attention
          </h2>
          <div className="flex flex-wrap gap-3">
            {stats.pendingShopClaims > 0 && (
              <Link href="/admin/shops/claims" className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm hover:border-amber-500/50 transition-colors">
                <span className="font-bold text-[var(--color-text)]">{stats.pendingShopClaims}</span>
                <span className="text-[var(--color-text-muted)] ml-1">shop claim{stats.pendingShopClaims !== 1 ? 's' : ''}</span>
              </Link>
            )}
            {stats.pendingShopSubmissions > 0 && (
              <Link href="/admin/shops/submissions" className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm hover:border-amber-500/50 transition-colors">
                <span className="font-bold text-[var(--color-text)]">{stats.pendingShopSubmissions}</span>
                <span className="text-[var(--color-text-muted)] ml-1">shop submission{stats.pendingShopSubmissions !== 1 ? 's' : ''}</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Growth metrics */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Growth</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={<UserPlus className="h-5 w-5" />} label="New today" value={stats.newUsersToday} href="/admin/users" />
          <StatCard icon={<Users className="h-5 w-5" />} label="New this week" value={stats.newUsersWeek} href="/admin/users" />
          <StatCard icon={<Users className="h-5 w-5" />} label="Total users" value={stats.totalUsers} href="/admin/users" />
          <StatCard icon={<Flame className="h-5 w-5" />} label="Active streaks" value={stats.activeStreaks} />
        </div>
      </div>

      {/* Content stats */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Content</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard icon={<Mountain className="h-5 w-5" />} label="Trails" value={stats.totalTrails} href="/admin/trails" />
          <StatCard icon={<MapPin className="h-5 w-5" />} label="Trail systems" value={stats.totalTrailSystems} />
          <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Forum posts" value={stats.totalPosts} />
          <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Events" value={stats.totalEvents} />
          <StatCard icon={<Star className="h-5 w-5" />} label="Gear reviews" value={stats.totalReviews} />
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Listings" value={stats.totalListings} />
        </div>
      </div>

      {/* Directory stats */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Directory</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard icon={<Store className="h-5 w-5" />} label="Shops" value={stats.totalShops} href="/admin/shops" />
          <StatCard icon={<Wrench className="h-5 w-5" />} label="Facilities" value={stats.totalFacilities} href="/admin/parks" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href?: string }) {
  const inner = (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-primary)]">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-[var(--color-text)]">{value.toLocaleString()}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      </div>
    </Card>
  )

  if (href) {
    return <Link href={href} className="transition-opacity hover:opacity-80">{inner}</Link>
  }
  return inner
}
