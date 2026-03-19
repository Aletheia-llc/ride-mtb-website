import { CheckCircle, Zap, Shield } from 'lucide-react'
import type { TrustLevel } from '@/modules/marketplace/types'

interface TrustBadgeProps {
  trustLevel: TrustLevel
}

export function TrustBadge({ trustLevel }: TrustBadgeProps) {
  switch (trustLevel) {
    case 'new':
      return null

    case 'established':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
          <Shield className="h-3.5 w-3.5" />
          Established
        </span>
      )

    case 'trusted':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
          <CheckCircle className="h-3.5 w-3.5" />
          Trusted Seller
        </span>
      )

    case 'power':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
          <Zap className="h-3.5 w-3.5 fill-current" />
          Power Seller
        </span>
      )
  }
}
