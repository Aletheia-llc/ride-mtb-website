import { requireAuth } from '@/lib/auth/guards'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center">
      {children}
    </div>
  )
}
