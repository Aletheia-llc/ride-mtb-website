import { randomBytes, createHash } from 'node:crypto'
import { db } from '@/lib/db/client'

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function validateInvite(rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const record = await db.inviteToken.findUnique({ where: { tokenHash } })
  if (!record) return null
  if (record.used) return null
  if (record.expiresAt < new Date()) return null
  return record
}
