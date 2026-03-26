import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db/client'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          select: { id: true, email: true, name: true, passwordHash: true },
        })
        if (!user?.passwordHash) return null
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        // Only on sign-in: fetch user data once and cache in the JWT
        token.sub = user.id
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true, bannedAt: true, onboardingCompletedAt: true, onboardingStep: true, emailVerified: true },
        })
        if (dbUser) {
          token.role = dbUser.role as 'user' | 'instructor' | 'admin'
          token.bannedAt = dbUser.bannedAt
          token.onboardingCompletedAt = dbUser.onboardingCompletedAt
          token.onboardingStep = dbUser.onboardingStep
          token.emailVerified = dbUser.emailVerified
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role ?? 'user'
        session.user.bannedAt = (token.bannedAt as Date | null) ?? null
        session.user.onboardingCompletedAt = (token.onboardingCompletedAt as Date | null) ?? null
        session.user.onboardingStep = token.onboardingStep ?? 1
        session.user.emailVerified = (token.emailVerified as Date | null) ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/signin',
  },
})
