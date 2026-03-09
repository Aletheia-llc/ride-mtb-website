import { NextMiddleware, NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

export function withI18n(next: NextMiddleware): NextMiddleware {
  return async (request: NextRequest, event: NextFetchEvent) => {
    // TODO: next-intl middleware integration
    // For now, pass through
    return next(request, event)
  }
}
