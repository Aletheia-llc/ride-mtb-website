import { db } from '@/lib/db/client'
import Link from 'next/link'
import { deleteManufacturer } from '@/modules/fantasy/actions/admin/manageManufacturer'
import Image from 'next/image'

export default async function AdminManufacturersPage() {
  const manufacturers = await db.bikeManufacturer.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { riders: true } } },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bike Manufacturers ({manufacturers.length})</h1>
        <Link href="/admin/fantasy/manufacturers/new"
          className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition">
          + New Manufacturer
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left">
            <th className="py-2 pr-4">Logo</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Slug</th>
            <th className="py-2 pr-4">Riders</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {manufacturers.map(m => (
            <tr key={m.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]">
              <td className="py-2 pr-4">
                {m.logoUrl
                  ? <Image src={m.logoUrl} alt={m.name} width={32} height={32} className="rounded" />
                  : <span className="text-[var(--color-text-muted)] text-xs">—</span>
                }
              </td>
              <td className="py-2 pr-4 font-medium">{m.name}</td>
              <td className="py-2 pr-4 font-mono text-xs text-[var(--color-text-muted)]">{m.slug}</td>
              <td className="py-2 pr-4">{m._count.riders}</td>
              <td className="py-2 flex gap-3">
                <Link href={`/admin/fantasy/manufacturers/${m.id}`}
                  className="text-blue-600 hover:underline text-sm">Edit</Link>
                <form action={async () => {
                  'use server'
                  await deleteManufacturer(m.id)
                }}>
                  <button type="submit"
                    className="text-red-500 hover:underline text-sm">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
