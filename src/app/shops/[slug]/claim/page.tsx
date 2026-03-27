import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
// eslint-disable-next-line no-restricted-imports
import { db } from '@/lib/db/client'
import { ClaimForm } from '@/modules/shops/components/ClaimForm'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ClaimPage({ params }: Props) {
  const { slug } = await params
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const shop = await db.shop.findUnique({
    where: { slug },
    select: { id: true, name: true, ownerId: true },
  })
  if (!shop) notFound()
  if (shop.ownerId) redirect(`/shops/${slug}`)

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-text)]">Claim {shop.name}</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Submit a claim request. An admin will review and approve it.
      </p>
      <ClaimForm shopId={shop.id} />
    </div>
  )
}
