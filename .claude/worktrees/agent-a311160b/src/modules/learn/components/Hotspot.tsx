'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, XCircle } from 'lucide-react'
import type { HotspotConfig } from '@/modules/learn/types'

interface HotspotProps {
  prompt: string
  config: HotspotConfig
  selectedId: string | null
  feedback: { correct: boolean; selectedId: string } | null
  onSelect: (zoneId: string) => void
  disabled?: boolean
}

export function Hotspot({
  prompt,
  config,
  selectedId,
  feedback,
  onSelect,
  disabled,
}: HotspotProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)
  const showResult = feedback !== null

  return (
    <div>
      <p className="mb-2 text-lg font-medium text-[var(--color-text)]">{prompt}</p>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">Click on the correct area of the image.</p>

      <div className="relative mx-auto max-w-2xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[var(--color-bg-secondary)]">
          <Image
            src={config.imageUrl}
            alt="Select the correct area"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 600px"
          />

          {config.zones.map((zone) => {
            const isSelected = selectedId === zone.id
            const wasSelected = feedback?.selectedId === zone.id
            const isHovered = hoveredZone === zone.id

            let borderStyle = 'border-transparent'
            if (showResult && zone.isCorrect) {
              borderStyle = 'border-green-500 bg-green-500/20'
            } else if (showResult && wasSelected && !zone.isCorrect) {
              borderStyle = 'border-red-500 bg-red-500/20'
            } else if (isSelected && !showResult) {
              borderStyle = 'border-green-500 bg-green-500/10'
            } else if (isHovered && !showResult) {
              borderStyle = 'border-[var(--color-text-muted)] bg-[var(--color-bg)]/10'
            }

            return (
              <button
                key={zone.id}
                onClick={() => onSelect(zone.id)}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                disabled={disabled || showResult}
                className={`absolute rounded border-2 transition-colors ${borderStyle} disabled:cursor-default`}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                }}
                aria-label={zone.label}
                aria-pressed={isSelected}
              >
                {showResult && zone.isCorrect && (
                  <div className="absolute -right-2 -top-2">
                    <CheckCircle className="h-5 w-5 rounded-full bg-[var(--color-bg)] text-green-600" />
                  </div>
                )}
                {showResult && wasSelected && !zone.isCorrect && (
                  <div className="absolute -right-2 -top-2">
                    <XCircle className="h-5 w-5 rounded-full bg-[var(--color-bg)] text-red-600" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {showResult && (
          <div className="mt-3 flex flex-wrap gap-2">
            {config.zones
              .filter((z) => z.isCorrect)
              .map((z) => (
                <span key={z.id} className="rounded bg-green-500/15 px-2 py-1 text-xs text-green-600">
                  Correct: {z.label}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
