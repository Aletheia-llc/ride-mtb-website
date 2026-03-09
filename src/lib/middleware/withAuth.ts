import { NextMiddleware, NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'

const protectedPaths = ['/profile', '/admin', '/coaching']

export function withAuth(next: NextMiddleware): NextMiddleware {
  return async (request: NextRequest, event: NextFetchEvent) => {
    const { pathname } = request.nextUrl
    const isProtected = protectedPaths.some(p => pathname.startsWith(p))

    if (isProtected) {
      const session = await auth()
      if (!session) {
        const signInUrl = new URL('/signin', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }
    }

    return next(request, event)
  }
}
