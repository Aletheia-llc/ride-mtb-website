import type { Metadata } from 'next'
import Link from 'next/link'
// eslint-disable-next-line no-restricted-imports
import { getAffiliateLinks } from '@/modules/affiliate/lib/queries'
import { toggleAffiliateLinkAction } from '@/modules/affiliate/actions/saveAffiliateLink'

export const metadata: Metadata = { title: 'Affiliate Links | Admin | Ride MTB' }

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

type AffiliateLinkRow = {
  id: string
  name: string
  slug: string
  linkType: string
  isActive: boolean
  _count: { clicks: number }
}

export default async function AdminAffiliatePage() {
  const links = (await getAffiliateLinks()) as AffiliateLinkRow[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Affiliate Links</h1>
        <Link href="/admin/affiliate/new" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)]">
          + New Link
        </Link>
      </div>

      {links.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-12 text-center">
          <p className="text-[var(--color-text-muted)]">No affiliate links yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Name</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Slug</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Type</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Clicks</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {links.map(link => (
                <tr key={link.id} className="hover:bg-[var(--color-bg-secondary)]">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{link.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-[var(--color-text-muted)]">{BASE_URL}/api/affiliate/track/{link.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{link.linkType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{link._count.clicks}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${link.isActive ? 'bg-green-100 text-green-700' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'}`}>
                      {link.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <form action={toggleAffiliateLinkAction}>
                        <input type="hidden" name="id" value={link.id} />
                        <button type="submit" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                          {link.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
