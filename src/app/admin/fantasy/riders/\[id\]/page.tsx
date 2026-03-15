'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRider, updateRider } from '@/modules/fantasy/actions/admin/manageRider'
import type { Discipline, Gender } from '@/generated/prisma/client'

interface RiderFormPageProps {
  params: { id: string }
  searchParams: Record<string, string | string[] | undefined>
}

export default function RiderFormPage({ params }: RiderFormPageProps) {
  const router = useRouter()
  const isNew = params.id === 'new'

  const [name, setName] = useState('')
  const [nationality, setNationality] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [uciId, setUciId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleDiscipline(d: Discipline) {
    setDisciplines(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (isNew) {
        await createRider({
          name,
          nationality,
          gender,
          disciplines,
          uciId: uciId || undefined
        })
      } else {
        await updateRider(params.id, {
          name,
          nationality,
          gender,
          disciplines,
          uciId: uciId || undefined,
        })
      }
      router.push('/admin/fantasy/riders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setSaving(false)
    }
  }

  const isValid = name && nationality && disciplines.length > 0

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isNew ? 'New Rider' : 'Edit Rider'}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nationality (ISO code, e.g. US, GB, FR)</label>
          <input
            value={nationality}
            onChange={e => setNationality(e.target.value.toUpperCase())}
            required
            maxLength={3}
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select
            value={gender}
            onChange={e => setGender(e.target.value as Gender)}
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Disciplines *</label>
          <div className="flex gap-4">
            {(['dh', 'ews', 'xc'] as const).map(d => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={disciplines.includes(d)}
                  onChange={() => toggleDiscipline(d)}
                />
                {d.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">UCI ID (optional)</label>
          <input
            value={uciId}
            onChange={e => setUciId(e.target.value)}
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={!isValid || saving}
            className="flex-1 bg-green-600 text-white py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition"
          >
            {saving ? 'Saving...' : isNew ? 'Create Rider' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-600 text-white py-2 rounded font-medium hover:bg-gray-700 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
