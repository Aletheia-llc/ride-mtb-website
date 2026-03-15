'use server'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
// eslint-disable-next-line no-restricted-imports
import { publishArticle } from '../lib/queries'

export async function togglePublishAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const id = formData.get('id') as string
  const publish = formData.get('publish') === 'true'

  await publishArticle(id, publish)

  revalidatePath('/admin/news')
  revalidatePath('/news')
}
