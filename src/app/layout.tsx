import { DM_Sans } from 'next/font/google'
import { PostHogProvider } from '@/lib/analytics/PostHogProvider'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })

export { siteMetadata as metadata } from './metadata'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
