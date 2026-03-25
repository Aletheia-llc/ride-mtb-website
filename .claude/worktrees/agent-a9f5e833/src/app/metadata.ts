import type { Metadata } from 'next'

export const siteMetadata: Metadata = {
  title: {
    default: 'Ride MTB',
    template: '%s | Ride MTB',
  },
  description: 'The mountain biking platform for riders, by riders. Learn, ride, connect.',
  metadataBase: new URL('https://ridemtb.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ridemtb.com',
    siteName: 'Ride MTB',
    title: 'Ride MTB',
    description: 'The mountain biking platform for riders, by riders. Learn, ride, connect.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ride MTB',
    description: 'The mountain biking platform for riders, by riders.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-512x512.png',
  },
}
