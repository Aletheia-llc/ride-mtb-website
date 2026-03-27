import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
// eslint-disable-next-line no-restricted-imports
import { getArticleBySlug } from '@/modules/editorial/lib/queries'
import { ArticleRenderer, ARTICLE_CATEGORY_LABELS } from '@/modules/editorial'
import type { ArticleCategory } from '@/modules/editorial'
import { ArticleJsonLd } from '@/modules/editorial/components/ArticleJsonLd'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ride-mtb.vercel.app'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article || article.status !== 'published') {
    return { title: 'Article Not Found | Ride MTB' }
  }

  return {
    title: `${article.title} | Ride MTB`,
    description: article.excerpt ?? article.title,
    alternates: {
      canonical: `${BASE_URL}/news/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt ?? article.title,
      type: 'article',
      url: `${BASE_URL}/news/${article.slug}`,
      publishedTime: article.publishedAt?.toISOString(),
      authors: article.authorName ? [article.authorName] : undefined,
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt ?? article.title,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article || article.status !== 'published') {
    notFound()
  }

  const publishedDate = article.publishedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(article.publishedAt))
    : null

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      {/* Back */}
      <Link
        href="/news"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to News
      </Link>

      {/* Category + date */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/news?category=${article.category}`}
          className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          {ARTICLE_CATEGORY_LABELS[article.category as ArticleCategory]}
        </Link>
        {publishedDate && (
          <time
            dateTime={article.publishedAt?.toISOString()}
            className="text-sm text-[var(--color-text-muted)]"
          >
            {publishedDate}
          </time>
        )}
      </div>

      {/* Title */}
      <h1 className="mb-4 text-3xl font-bold leading-tight text-[var(--color-text)] sm:text-4xl">
        {article.title}
      </h1>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="mb-6 text-lg text-[var(--color-text-muted)] leading-relaxed">
          {article.excerpt}
        </p>
      )}

      {/* Author */}
      {article.authorName && (
        <p className="mb-8 text-sm text-[var(--color-text-muted)]">
          By <span className="font-medium text-[var(--color-text)]">{article.authorName}</span>
        </p>
      )}

      {/* Cover image */}
      {article.coverImageUrl && (
        <div className="mb-8 overflow-hidden rounded-xl aspect-video">
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            width={900}
            height={506}
            className="h-full w-full object-cover"
            priority
            unoptimized
          />
        </div>
      )}

      {/* Structured data */}
      {article.publishedAt && <ArticleJsonLd article={article} />}

      {/* Body */}
      <ArticleRenderer content={article.body} />

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-6">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={`/news?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}
