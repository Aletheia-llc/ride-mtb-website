import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db/client'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role ?? 'user'
        session.user.bannedAt = user.bannedAt ?? null
        session.user.onboardingCompletedAt = user.onboardingCompletedAt ?? null
        session.user.onboardingStep = user.onboardingStep ?? 1
      }
      return session
    },
  },
  pages: {
    signIn: '/signin',
  },
})
