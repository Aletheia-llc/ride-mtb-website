import 'next-auth'
import '@auth/core/adapters'
import 'next-auth/jwt'

type Role = 'user' | 'instructor' | 'admin'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
      bannedAt?: Date | null
      onboardingCompletedAt?: Date | null
      onboardingStep?: number
      emailVerified?: Date | null
    }
  }

  interface User {
    role?: Role
    bannedAt?: Date | null
    onboardingCompletedAt?: Date | null
    onboardingStep?: number
  }
}

declare module '@auth/core/adapters' {
  interface AdapterUser {
    role?: Role
    bannedAt?: Date | null
    onboardingCompletedAt?: Date | null
    onboardingStep?: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role
    bannedAt?: Date | null
    onboardingCompletedAt?: Date | null
    onboardingStep?: number
    emailVerified?: Date | null
  }
}
