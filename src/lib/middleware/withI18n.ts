import type { NextMiddleware, NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'

export const supportedLocales = ['en'] as const
export type Locale = (typeof supportedLocales)[number]
export const defaultLocale: Locale = 'en'

const intlMiddleware = createMiddleware({
  locales: supportedLocales,
  defaultLocale,
  localePrefix: 'never',
  alternateLinks: false,
})

export function withI18n(next: NextMiddleware): NextMiddleware {
  return async (request: NextRequest, event: NextFetchEvent) => {
    const intlResponse = intlMiddleware(request)

    // If next-intl wants to redirect (e.g. normalise a locale prefix), honour it
    if (intlResponse.status !== 200) {
      return intlResponse
    }

    // Otherwise let the rest of the middleware chain run, but carry over the
    // locale cookie only (skip x-middleware-rewrite — the app has no [locale]
    // route segments so forwarding that header causes all routes to 404).
    const response = await next(request, event)

    if (response instanceof NextResponse) {
      intlResponse.cookies.getAll().forEach(({ name, value }) => {
        response.cookies.set(name, value)
      })
    }

    return response
  }
}
