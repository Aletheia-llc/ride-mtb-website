import { chain } from '@/lib/middleware/chain'
import { withI18n } from '@/lib/middleware/withI18n'
import { withAuth } from '@/lib/middleware/withAuth'

export default chain([withI18n, withAuth])

export const config = {
  // Exclude API routes, static assets, and public files.
  // Prevents i18n middleware from redirecting /api/health to /en/api/health
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|fonts|ads).*)'],
}
