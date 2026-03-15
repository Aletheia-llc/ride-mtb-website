import { db } from '@/lib/db/client'
import Link from 'next/link'

export default async function AdminRidersPage() {
  const riders = await db.rider.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { eventEntries: true } } },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rider Database ({riders.length})</h1>
        <Link href="/admin/fantasy/riders/new" className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition">
          + New Rider
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Nationality</th>
            <th className="py-2 pr-4">Gender</th>
            <th className="py-2 pr-4">Disciplines</th>
            <th className="py-2 pr-4">Events</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {riders.map(r => (
            <tr key={r.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]">
              <td className="py-2 pr-4 font-medium">{r.name}</td>
              <td className="py-2 pr-4">{r.nationality}</td>
              <td className="py-2 pr-4 capitalize">{r.gender}</td>
              <td className="py-2 pr-4">{r.disciplines.join(', ').toUpperCase()}</td>
              <td className="py-2 pr-4">{r._count.eventEntries}</td>
              <td className="py-2">
                <Link href={`/admin/fantasy/riders/${r.id}`} className="text-blue-600 hover:underline text-sm">Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
