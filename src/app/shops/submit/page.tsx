import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { SubmitShopForm } from '@/modules/shops/components/SubmitShopForm'

export default async function SubmitShopPage() {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Add Your Shop</h1>
      <p className="mb-8 text-[var(--color-text-muted)] text-sm">
        Submit your shop for review. Once approved, it will appear in the directory and you&apos;ll be set as the owner.
      </p>
      <SubmitShopForm />
    </div>
  )
}
