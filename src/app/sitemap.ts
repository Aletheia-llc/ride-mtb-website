import type { MetadataRoute } from 'next'
// eslint-disable-next-line no-restricted-imports
import { getAllPublishedArticleSlugs } from '@/modules/editorial/lib/queries'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articleSlugs = await getAllPublishedArticleSlugs()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,       lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
    { url: `${BASE_URL}/news`,   lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE_URL}/forum`,  lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8 },
    { url: `${BASE_URL}/trails`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/learn`,  lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/shops`,  lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ]

  const articleEntries: MetadataRoute.Sitemap = articleSlugs.map(({ slug, updatedAt }) => ({
    url: `${BASE_URL}/news/${slug}`,
    lastModified: updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticEntries, ...articleEntries]
}
