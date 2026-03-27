import type { ArticleDetail } from '../types'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

interface ArticleJsonLdProps {
  article: ArticleDetail
}

export function ArticleJsonLd({ article }: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? article.title,
    ...(article.coverImageUrl && { image: article.coverImageUrl }),
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: article.authorName ?? 'Ride MTB',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ride MTB',
      url: BASE_URL,
    },
  }

  return (
    <script
      type="application/ld+json"
      // Safe: content is constructed from our own DB fields via JSON.stringify
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
