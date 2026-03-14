export const dynamic = 'force-dynamic'

import { DM_Sans } from 'next/font/google'
import { Providers } from './Providers'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export { siteMetadata as metadata } from './metadata'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
