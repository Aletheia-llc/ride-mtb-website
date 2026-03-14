import { getCreators } from '../lib/queries'
import { InviteButton } from './InviteButton'

const STATUS_COLORS: Record<string, string> = {
  invited: 'bg-yellow-500/10 text-yellow-600',
  onboarding: 'bg-blue-500/10 text-blue-600',
  active: 'bg-green-500/10 text-green-600',
  suspended: 'bg-red-500/10 text-red-600',
}

export async function AdminCreatorPanel() {
  const creators = await getCreators()

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-1 text-lg font-semibold text-[var(--color-text)]">Invite a Creator</h2>
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Generates a single-use invite link valid for 7 days.
        </p>
        <InviteButton />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
          Creators ({creators.length})
        </h2>
        {creators.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No creators yet. Generate an invite link to get started.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-secondary)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Creator</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Videos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {creators.map((c) => (
                  <tr key={c.id} className="bg-[var(--color-surface)]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text)]">{c.displayName}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{c.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{c._count.videos}</td>
                    <td className="px-4 py-3 text-xs">
                      {c.stripeAccountId
                        ? <span className="text-green-600">Connected</span>
                        : <span className="text-[var(--color-text-muted)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
