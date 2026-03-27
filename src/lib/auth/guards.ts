import 'server-only'
import { auth } from '@/lib/auth/config'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
  if (session.user.bannedAt) redirect('/banned')
  return session.user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== 'admin') redirect('/403')
  return user
}

export async function requireRole(role: string) {
  const user = await requireAuth()
  if (user.role !== role && user.role !== 'admin') redirect('/403')
  return user
}

export async function requireShopOwner(slug: string) {
  const user = await requireAuth()
  const shop = await db.shop.findUnique({ where: { slug } })
  if (!shop) notFound()
  if (shop.ownerId !== user.id && user.role !== 'admin') redirect('/403')
  return { user, shop }
}
