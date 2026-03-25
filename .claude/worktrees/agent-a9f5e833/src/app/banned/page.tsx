import { signOut } from '@/lib/auth/config'

export const metadata = {
  title: 'Account Suspended | Ride MTB',
}

export default function BannedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-3 text-2xl font-bold text-[var(--color-text)]">Account Suspended</h1>
      <p className="mb-6 max-w-sm text-[var(--color-text-muted)]">
        Your account has been suspended. If you believe this is an error, please contact support.
      </p>
      <form
        action={async () => {
          'use server'
          await signOut({ redirectTo: '/' })
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
