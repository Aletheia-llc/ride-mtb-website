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
      if (user?.id) token.sub = user.id
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        const dbUser = await db.user.findUnique({
          where: { id: token.sub },
          select: { role: true, bannedAt: true, onboardingCompletedAt: true, onboardingStep: true, emailVerified: true },
        })
        session.user.role = dbUser?.role ?? 'user'
        session.user.bannedAt = dbUser?.bannedAt ?? null
        session.user.onboardingCompletedAt = dbUser?.onboardingCompletedAt ?? null
        session.user.onboardingStep = dbUser?.onboardingStep ?? 1
        session.user.emailVerified = dbUser?.emailVerified ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/signin',
  },
})
