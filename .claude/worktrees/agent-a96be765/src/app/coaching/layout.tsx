import { notFound } from 'next/navigation'
import { flags } from '@/lib/flags'

export default function CoachingLayout({ children }: { children: React.ReactNode }) {
  if (!flags.coaching) notFound()

  return <>{children}</>
}
