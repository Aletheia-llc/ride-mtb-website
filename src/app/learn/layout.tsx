import { LearnSubNav } from '@/ui/components/LearnSubNav'

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LearnSubNav />
      {children}
    </>
  )
}
