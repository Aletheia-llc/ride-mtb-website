import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ManagePage({ params }: Props) {
  const { slug } = await params
  redirect(`/shops/${slug}/manage/edit`)
}
