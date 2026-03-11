import { NextMiddleware, NextResponse } from 'next/server'

type MiddlewareFactory = (next: NextMiddleware) => NextMiddleware

export function chain(functions: MiddlewareFactory[]): NextMiddleware {
  return functions.reduceRight<NextMiddleware>(
    (next, fn) => fn(next),
    () => NextResponse.next()
  )
}
