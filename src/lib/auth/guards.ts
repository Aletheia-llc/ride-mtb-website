import 'server-only'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
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
