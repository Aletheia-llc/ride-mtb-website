import type { Session } from 'next-auth'
import { TopNavClient } from './TopNavClient'

interface TopNavProps {
  session: Session | null
}

export function TopNav({ session }: TopNavProps) {
  return <TopNavClient session={session} />
}
