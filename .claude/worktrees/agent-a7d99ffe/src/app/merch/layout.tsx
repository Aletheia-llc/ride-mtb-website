import { flags } from '@/lib/flags'
import { notFound } from 'next/navigation'

export default function MerchLayout({ children }: { children: React.ReactNode }) {
  if (!flags.merch) notFound()
  return <>{children}</>
}
