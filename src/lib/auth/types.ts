import 'next-auth'
import '@auth/core/adapters'

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
    }
  }

  interface User {
    role?: Role
    bannedAt?: Date | null
  }
}

declare module '@auth/core/adapters' {
  interface AdapterUser {
    role?: Role
    bannedAt?: Date | null
  }
}
