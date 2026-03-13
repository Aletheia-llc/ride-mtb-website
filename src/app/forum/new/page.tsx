import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
// eslint-disable-next-line no-restricted-imports
import { NewThreadForm } from '@/modules/forum/components/NewThreadForm'

export const metadata = {
  title: 'Create Post | Forum | Ride MTB',
}

export default async function NewForumThreadPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin?callbackUrl=/forum/new')

  const categories = await db.forumCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true },
  })

  // Default to general-discussion
  const defaultCategory = categories.find((c) => c.slug === 'general-discussion') ?? categories[0]

  if (!defaultCategory) redirect('/forum')

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">Create a Post</h1>
      <NewThreadForm
        categoryId={defaultCategory.id}
        categorySlug={defaultCategory.slug}
      />
    </div>
  )
}
