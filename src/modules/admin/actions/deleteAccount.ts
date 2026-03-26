'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import { deleteAccount as deleteAccountRecord } from '../lib/queries'

export type DeleteAccountState = {
  errors: Record<string, string>
  success?: boolean
  outcome?: 'deleted' | 'anonymized'
}

/**
 * Admin action to delete or anonymize a user account.
 *
 * - Users with no Transaction history are hard-deleted (cascades clean up everything).
 * - Users who appear as buyer or seller on any Transaction are anonymized instead:
 *   PII is scrubbed, auth tokens are revoked, and the account is locked. The user
 *   row remains so Transaction foreign keys stay intact for the financial audit trail.
 */
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  try {
    const admin = await requireAdmin()

    const userId = formData.get('userId')
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return { errors: { userId: 'User ID is required.' } }
    }

    if (userId === admin.id) {
      return { errors: { general: 'You cannot delete your own account.' } }
    }

    const result = await deleteAccountRecord(userId)

    revalidatePath('/admin/users')

    return { errors: {}, success: true, outcome: result.outcome }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
