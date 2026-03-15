import type { Session } from 'next-auth'
import { flags } from '@/lib/flags'
import { TopNavClient } from './TopNavClient'

interface TopNavProps {
  session: Session | null
}

export function TopNav({ session }: TopNavProps) {
  return <TopNavClient session={session} features={{ marketplace: flags.marketplace }} />
}
