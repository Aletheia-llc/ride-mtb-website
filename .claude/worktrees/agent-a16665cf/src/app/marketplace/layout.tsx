import { flags } from '@/lib/flags'
import { notFound } from 'next/navigation'

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  if (!flags.marketplace) notFound()
  return <>{children}</>
}
