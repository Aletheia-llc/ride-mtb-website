'use client'

interface VideoPlayerProps {
  url: string
  title?: string | null
}

function isYouTube(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function getYouTubeEmbedUrl(url: string): string | null {
  let videoId: string | null = null

  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split(/[?&#]/)[0] ?? null
  } else if (url.includes('youtube.com')) {
    const match = url.match(/[?&]v=([^&#]+)/)
    videoId = match?.[1] ?? null
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

export function VideoPlayer({ url, title }: VideoPlayerProps) {
  if (isYouTube(url)) {
    const embedUrl = getYouTubeEmbedUrl(url)

    if (!embedUrl) {
      return (
        <div className="flex aspect-video items-center justify-center rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
          <p>Unable to load YouTube video</p>
        </div>
      )
    }

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={embedUrl}
          title={title ?? 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    )
  }

  // Native HTML5 video
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video
        src={url}
        controls
        className="h-full w-full"
        preload="metadata"
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
