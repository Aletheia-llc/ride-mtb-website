export const dynamic = 'force-dynamic'

import { DM_Sans } from 'next/font/google'
import { Providers } from './Providers'
import { TopNav } from '@/ui/components/TopNav'
import { auth } from '@/lib/auth/config'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export { siteMetadata as metadata } from './metadata'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="en" className={dmSans.variable}>
      <body>
        <TopNav session={session} />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
