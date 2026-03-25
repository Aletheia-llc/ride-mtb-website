'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/guards'
import {
  updateUserRole,
  banUser,
  unbanUser,
} from '../lib/queries'

const manageUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  action: z.enum(['changeRole', 'ban', 'unban']),
  role: z.enum(['user', 'instructor', 'admin']).optional(),
})

export type ManageUserState = {
  errors: Record<string, string>
  success?: boolean
}

export async function manageUser(
  _prevState: ManageUserState,
  formData: FormData,
): Promise<ManageUserState> {
  try {
    const admin = await requireAdmin()

    const raw = {
      userId: formData.get('userId') as string,
      action: formData.get('action') as string,
      role: formData.get('role') as string | undefined,
    }

    const parsed = manageUserSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      return { errors: fieldErrors }
    }

    const { userId, action, role } = parsed.data

    if (userId === admin.id) {
      return { errors: { general: 'You cannot modify your own account.' } }
    }

    switch (action) {
      case 'changeRole': {
        if (!role) {
          return { errors: { role: 'Role is required for role change.' } }
        }
        await updateUserRole(userId, role)
        break
      }
      case 'ban': {
        await banUser(userId)
        break
      }
      case 'unban': {
        await unbanUser(userId)
        break
      }
    }

    revalidatePath('/admin/users')

    return { errors: {}, success: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }
    return { errors: { general: 'Something went wrong. Please try again.' } }
  }
}
