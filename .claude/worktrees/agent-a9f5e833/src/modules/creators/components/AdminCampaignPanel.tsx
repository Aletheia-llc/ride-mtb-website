// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { requireAdmin } from '@/lib/auth/guards'

export async function AdminCampaignPanel() {
  await requireAdmin()
  const campaigns = await db.adCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      advertiserName: true,
      cpmCents: true,
      dailyImpressionCap: true,
      startDate: true,
      endDate: true,
      status: true,
      _count: { select: { impressions: { where: { status: 'confirmed' } } } },
    },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">Ad Campaigns</h2>
        <a
          href="/admin/creators/campaigns/new"
          className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          New Campaign
        </a>
      </div>
      {campaigns.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No campaigns yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <tr>
                {['Advertiser', 'CPM', 'Daily Cap', 'Period', 'Status', 'Impressions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{c.advertiserName}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">${(c.cpmCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{c.dailyImpressionCap.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)]">{c._count.impressions.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
