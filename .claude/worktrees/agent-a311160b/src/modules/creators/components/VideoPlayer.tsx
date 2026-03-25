'use client'

import { useEffect, useRef } from 'react'
import type Player from 'video.js/dist/types/player'

interface VideoPlayerProps {
  videoId: string
  hlsUrl: string
  title: string
  creatorName: string
  thumbnailUrl?: string
}

export function VideoPlayer({ videoId, hlsUrl, title: _title, creatorName: _creatorName, thumbnailUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hlsUrl) return

    let player: Player | null = null

    async function initPlayer() {
      const videojs = (await import('video.js')).default
      const vastClient = await import('vast-client')

      const el = videoRef.current
      if (!el) return

      player = videojs(el, {
        controls: true,
        fluid: true,
        poster: thumbnailUrl,
        sources: [{ src: hlsUrl, type: 'application/x-mpegURL' }],
      })

      // Fetch VAST before first play
      player.one('play', async () => {
        player?.pause()
        try {
          const vastUrl = `/api/creators/ads/vast?videoId=${videoId}`
          const client = new vastClient.VASTClient()
          const response = await client.get(vastUrl)
          const ad = response.ads?.[0]
          const creative = ad?.creatives?.[0] as { mediaFiles?: Array<{ fileURL: string }>; trackingEvents?: Record<string, string[]> } | undefined
          const mediaFile = creative?.mediaFiles?.[0]

          if (mediaFile?.fileURL) {
            // Show ad overlay
            const adVideo = document.createElement('video')
            adVideo.src = mediaFile.fileURL
            adVideo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;background:#000;z-index:10'
            adVideo.controls = false
            containerRef.current?.appendChild(adVideo)

            // Skip button after 5s
            const skipBtn = document.createElement('button')
            skipBtn.textContent = 'Skip Ad'
            skipBtn.style.cssText =
              'position:absolute;bottom:60px;right:12px;z-index:11;padding:6px 12px;background:rgba(0,0,0,0.7);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:4px;font-size:12px;cursor:pointer;display:none'
            containerRef.current?.appendChild(skipBtn)

            setTimeout(() => { skipBtn.style.display = 'block' }, 5000)

            const cleanupAd = () => {
              adVideo.remove()
              skipBtn.remove()
              player?.play()
            }

            adVideo.addEventListener('ended', cleanupAd)
            skipBtn.addEventListener('click', () => {
              // Fire skip tracking
              const skipUrl = creative?.trackingEvents?.skip?.[0]
              if (skipUrl) fetch(skipUrl).catch(() => {})
              cleanupAd()
            })

            // Fire impression — vast-client places <Impression> URLs on ad.impressionURLTemplates,
            // NOT in creative.trackingEvents (which only contains <TrackingEvents> children)
            const impressionUrl = ad?.impressionURLTemplates?.[0]?.url
            if (impressionUrl) fetch(impressionUrl).catch(() => {})

            adVideo.play().catch(() => { cleanupAd() })
            return
          }
        } catch {
          // No ad available — proceed to content
        }
        player?.play()
      })
    }

    initPlayer().catch(console.error)

    return () => { player?.dispose() }
  }, [hlsUrl, videoId, thumbnailUrl])

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16/9' }}>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered w-full"
        data-setup="{}"
      />
    </div>
  )
}
