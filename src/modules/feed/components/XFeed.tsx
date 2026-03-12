import Image from 'next/image'
import Link from 'next/link'
import { Heart, Repeat2, MessageCircle, ExternalLink } from 'lucide-react'
import { fetchMTBTweets } from '@/lib/x/client'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export async function XFeed() {
  const tweets = await fetchMTBTweets(6)

  if (tweets.length === 0) return null

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <XLogo className="h-3 w-3" />
          MTB Live
        </p>
        <Link
          href="https://x.com/search?q=mountain+biking&src=typed_query&f=live"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          View more <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>

      {/* Tweets */}
      <ul className="flex flex-col divide-y divide-[var(--color-border)]">
        {tweets.map((tweet) => (
          <li key={tweet.id} className="py-2.5 first:pt-0 last:pb-0">
            <Link
              href={tweet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              {/* Author row */}
              <div className="mb-1 flex items-center gap-1.5">
                {tweet.author.avatarUrl ? (
                  <Image
                    src={tweet.author.avatarUrl}
                    alt={tweet.author.name}
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-[8px] font-bold text-[var(--color-text-muted)]">
                    {tweet.author.name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                  {tweet.author.name}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  @{tweet.author.username}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-[var(--color-text-muted)]">
                  {timeAgo(tweet.createdAt)}
                </span>
              </div>

              {/* Tweet text */}
              <p className="line-clamp-3 text-xs leading-relaxed text-[var(--color-text)]">
                {tweet.text}
              </p>

              {/* Media thumbnail */}
              {tweet.mediaUrl && (
                <div className="mt-1.5 overflow-hidden rounded-md">
                  <Image
                    src={tweet.mediaUrl}
                    alt="Tweet media"
                    width={240}
                    height={120}
                    className="w-full object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* Metrics */}
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
                <span className="flex items-center gap-0.5">
                  <Heart className="h-2.5 w-2.5" />
                  {tweet.metrics.likes.toLocaleString()}
                </span>
                <span className="flex items-center gap-0.5">
                  <Repeat2 className="h-2.5 w-2.5" />
                  {tweet.metrics.retweets.toLocaleString()}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageCircle className="h-2.5 w-2.5" />
                  {tweet.metrics.replies.toLocaleString()}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
