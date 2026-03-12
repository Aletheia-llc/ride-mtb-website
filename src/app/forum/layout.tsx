import { ForumSubNav } from '@/ui/components/ForumSubNav'

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ForumSubNav />
      {children}
    </>
  )
}
