import { NextMiddleware, NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

const protectedPaths = ['/profile', '/admin', '/coaching', '/bikes/garage', '/messages']

// Cookie names NextAuth v5 uses (plain HTTP + Secure prefix for HTTPS)
const SESSION_COOKIE_NAMES = ['next-auth.session-token', '__Secure-next-auth.session-token']

export function withAuth(next: NextMiddleware): NextMiddleware {
  return async (request: NextRequest, event: NextFetchEvent) => {
    const { pathname } = request.nextUrl
    const isProtected = protectedPaths.some(p => pathname.startsWith(p))

    if (isProtected) {
      const hasSession = SESSION_COOKIE_NAMES.some(name => request.cookies.has(name))
      if (!hasSession) {
        const signInUrl = new URL('/signin', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }
    }

    return next(request, event)
  }
}
