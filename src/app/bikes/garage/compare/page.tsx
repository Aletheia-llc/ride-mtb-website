// src/app/bikes/garage/compare/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
// eslint-disable-next-line no-restricted-imports -- server component, direct module import is intentional
import { getBikesForCompare } from '@/modules/bikes/lib/garage-queries'
import { ComparisonView } from '@/modules/bikes/components/garage/ComparisonView'

export const metadata: Metadata = { title: 'Compare Bikes | Ride MTB' }

interface Props {
  searchParams: Promise<{ bikes?: string }>
}

export default async function ComparePage({ searchParams }: Props) {
  const { bikes: bikesParam } = await searchParams

  if (!bikesParam) redirect('/bikes/garage')

  const bikeIds = bikesParam.split(',').filter(Boolean)
  if (bikeIds.length < 2 || bikeIds.length > 3) redirect('/bikes/garage')

  const user = await requireAuth()
  const bikes = await getBikesForCompare(bikeIds, user.id)

  if (bikes.length < 2) redirect('/bikes/garage')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Link
          href="/bikes/garage"
          className="flex items-center gap-1 transition-colors hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          My Garage
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Compare</span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold text-[var(--color-text)]">Compare Bikes</h1>

      <ComparisonView bikes={bikes} />
    </div>
  )
}
