import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { Card } from '@/ui/components'
import { CreateListingForm } from '@/modules/marketplace'

export const metadata: Metadata = {
  title: 'Create Listing | Marketplace | Ride MTB',
  description: 'List your mountain bike gear for sale on the Ride MTB Marketplace.',
}

export default async function CreateListingPage() {
  await requireAuth()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/marketplace"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <h1 className="mb-6 text-3xl font-bold text-[var(--color-text)]">
        Create Listing
      </h1>

      <Card>
        <CreateListingForm />
      </Card>
    </div>
  )
}
