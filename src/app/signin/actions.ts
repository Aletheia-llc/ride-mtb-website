'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth/config'

export async function credentialsSignIn(
  callbackUrl: string,
  prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: callbackUrl,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') return 'Invalid email or password.'
      return 'Something went wrong. Please try again.'
    }
    throw error // Re-throw redirect errors so Next.js can process them
  }
  return null
}
