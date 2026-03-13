import { LearnSubNav } from '@/ui/components/LearnSubNav'
// eslint-disable-next-line no-restricted-imports
import { LearnChatbot } from '@/modules/learn/components/LearnChatbot'

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LearnSubNav />
      {children}
      <LearnChatbot />
    </>
  )
}
