'use client'

import { Download } from 'lucide-react'

interface GpxDownloadButtonProps {
  trailName: string
  trackData: string // JSON: [[lat, lng, ele], ...]
}

function toGpxXml(name: string, points: [number, number, number?][]): string {
  const trkpts = points
    .map(([lat, lng, ele]) => {
      const eleTag = ele != null ? `<ele>${ele.toFixed(1)}</ele>` : ''
      return `      <trkpt lat="${lat}" lon="${lng}">${eleTag}</trkpt>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Ride MTB" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${name.replace(/[<>&'"]/g, '')}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`
}

export function GpxDownloadButton({ trailName, trackData }: GpxDownloadButtonProps) {
  function handleDownload() {
    let points: [number, number, number?][]
    try {
      const parsed = typeof trackData === 'string' ? JSON.parse(trackData) : trackData
      points = parsed
    } catch {
      return
    }

    if (!Array.isArray(points) || points.length < 2) return

    const gpx = toGpxXml(trailName, points)
    const blob = new Blob([gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const slug = trailName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.gpx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg-secondary)]"
    >
      <Download className="h-4 w-4" />
      Download GPX
    </button>
  )
}
