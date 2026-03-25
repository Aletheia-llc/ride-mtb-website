import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profile | Ride MTB',
  description: 'Your rider profile on Ride MTB',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {children}
    </div>
  )
}
