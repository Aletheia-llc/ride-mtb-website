'use server'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// eslint-disable-next-line no-restricted-imports
import { deleteArticle } from '../lib/queries'

export async function deleteArticleAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const id = formData.get('id') as string
  await deleteArticle(id)

  revalidatePath('/admin/news')
  redirect('/admin/news')
}
