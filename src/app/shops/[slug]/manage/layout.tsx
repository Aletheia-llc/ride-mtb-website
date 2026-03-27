import { requireShopOwner } from '@/lib/auth/guards'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function ManageLayout({ children, params }: Props) {
  // Auth check — redirects non-owners before rendering anything
  await requireShopOwner((await params).slug)
  return <>{children}</>
}
